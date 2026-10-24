// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title Halka - atomic multi-party barter cycles
/// @notice Executes trade cycles of ANY length in a single transaction.
///
/// Why this contract exists: the barter-exchange literature (Abraham, Blum &
/// Sandholm, EC '07) caps trade cycles at length 2-3 because "for incentive
/// reasons, all transplants in a cycle must be performed simultaneously" --
/// a physical constraint, not a mathematical one. On-chain, simultaneity is
/// free, so the cap disappears.
///
/// Ownership lives inside this contract. A cycle execution is a permutation of
/// owners applied in one transaction: either every participant moves, or none
/// does. There is no intermediate state in which someone has given up their
/// item without receiving one.
contract Halka {
    struct Item {
        address owner;
        uint8 kind; // 0 = post (becayis), 1 = sticker (room demo)
        bool active;
        string label;
    }

    uint32 public itemCount;
    address public immutable admin;

    mapping(uint32 => Item) private _items;
    mapping(address => uint32[]) private _owned;

    /// itemId => ranked wish list, most-wanted first (lexicographic preference)
    mapping(uint32 => uint32[]) private _wants;
    /// itemId => targetId => rank + 1 (0 means "not wanted")
    mapping(uint32 => mapping(uint32 => uint16)) private _rank;

    mapping(address => bool) public hasClaimed;

    uint8 public constant MAX_STICKERS = 3;
    uint16 public constant MAX_WANTS = 64;

    event ItemCreated(uint32 indexed itemId, address indexed owner, uint8 kind, string label);
    event WantsSet(uint32 indexed itemId, uint32[] rankedTargets);
    event CycleExecuted(uint32[] cycle, address[] participants, uint256 length);

    error OnlyAdmin();
    error LengthMismatch();
    error AlreadyClaimed();
    error BadAmount();
    error NotItemOwner(uint32 itemId);
    error ItemNotActive(uint32 itemId);
    error SelfWant(uint32 itemId);
    error DuplicateWant(uint32 targetId);
    error TooManyWants();
    error UnknownItem(uint32 itemId);
    error CycleTooShort();
    error CycleTooLong();
    error RepeatedItemInCycle(uint32 itemId);
    error SameOwnerInCycle(address owner);
    /// @dev the participant holding `itemId` never asked for `targetId`
    error TargetNotWanted(uint32 itemId, uint32 targetId);

    string[8] private _stickerNames = [
        "Mor Molandak",
        "Turuncu Chog",
        "Mavi Moyaki",
        "Yesil Salmonad",
        "Kirmizi Molandak",
        "Sari Chog",
        "Pembe Moyaki",
        "Siyah Salmonad"
    ];

    constructor() {
        admin = msg.sender;
    }

    // ------------------------------------------------------------------
    // Creating items
    // ------------------------------------------------------------------

    /// @notice Seed becayis posts (kind 0). Admin only.
    function seedItems(address[] calldata owners, string[] calldata labels)
        external
        returns (uint32[] memory ids)
    {
        if (msg.sender != admin) revert OnlyAdmin();
        if (owners.length != labels.length) revert LengthMismatch();

        ids = new uint32[](owners.length);
        for (uint256 i = 0; i < owners.length; i++) {
            ids[i] = _mint(owners[i], 0, labels[i]);
        }
    }

    /// @notice Room demo: claim up to MAX_STICKERS random stickers, once per address.
    /// @dev Pseudo-random by blockhash; good enough for a demo, not secure randomness.
    function claimStickers(uint8 howMany) external returns (uint32[] memory ids) {
        if (hasClaimed[msg.sender]) revert AlreadyClaimed();
        if (howMany == 0 || howMany > MAX_STICKERS) revert BadAmount();

        hasClaimed[msg.sender] = true;
        ids = new uint32[](howMany);

        for (uint256 i = 0; i < howMany; i++) {
            uint256 seed = uint256(
                keccak256(abi.encodePacked(blockhash(block.number - 1), msg.sender, i, itemCount))
            );
            ids[i] = _mint(msg.sender, 1, _stickerNames[seed % 8]);
        }
    }

    function _mint(address owner, uint8 kind, string memory label) private returns (uint32 id) {
        itemCount += 1;
        id = itemCount;
        _items[id] = Item({owner: owner, kind: kind, active: true, label: label});
        _owned[owner].push(id);
        emit ItemCreated(id, owner, kind, label);
    }

    // ------------------------------------------------------------------
    // Preferences
    // ------------------------------------------------------------------

    /// @notice Set the ranked wish list for an item you own. Most-wanted first.
    /// @dev Replaces any previous list. Order IS the preference - this is the
    ///      lexicographic input the cycle search and verifyTTCStep rely on.
    function setWants(uint32 itemId, uint32[] calldata rankedTargets) external {
        Item storage it = _items[itemId];
        if (it.owner != msg.sender) revert NotItemOwner(itemId);
        if (!it.active) revert ItemNotActive(itemId);
        if (rankedTargets.length > MAX_WANTS) revert TooManyWants();

        // clear the old list and its ranks
        uint32[] storage old = _wants[itemId];
        for (uint256 i = 0; i < old.length; i++) {
            _rank[itemId][old[i]] = 0;
        }
        delete _wants[itemId];

        for (uint256 i = 0; i < rankedTargets.length; i++) {
            uint32 t = rankedTargets[i];
            if (t == itemId) revert SelfWant(itemId);
            if (t == 0 || t > itemCount) revert UnknownItem(t);
            if (_rank[itemId][t] != 0) revert DuplicateWant(t);
            _rank[itemId][t] = uint16(i + 1);
            _wants[itemId].push(t);
        }

        emit WantsSet(itemId, rankedTargets);
    }

    // ------------------------------------------------------------------
    // Cycle execution - the whole point of the project
    // ------------------------------------------------------------------

    /// @notice Execute a trade cycle atomically.
    /// @param cycle Item ids in cycle order. The owner of cycle[i] receives
    ///        cycle[i+1], and the owner of the last receives cycle[0].
    /// @dev Any failed check reverts the WHOLE transaction. There is no partial
    ///      execution, which is exactly what makes long cycles possible here and
    ///      impossible in the physical world.
    function executeCycle(uint32[] calldata cycle) external {
        uint256 n = cycle.length;
        if (n < 2) revert CycleTooShort();
        if (n > 64) revert CycleTooLong();

        address[] memory owners = new address[](n);

        // 1. every item active, no item repeated
        for (uint256 i = 0; i < n; i++) {
            uint32 id = cycle[i];
            if (id == 0 || id > itemCount) revert UnknownItem(id);
            Item storage it = _items[id];
            if (!it.active) revert ItemNotActive(id);
            owners[i] = it.owner;
            for (uint256 j = 0; j < i; j++) {
                if (cycle[j] == id) revert RepeatedItemInCycle(id);
            }
        }

        // 2. owners pairwise distinct (a cycle through one person is not a trade)
        for (uint256 i = 0; i < n; i++) {
            for (uint256 j = i + 1; j < n; j++) {
                if (owners[i] == owners[j]) revert SameOwnerInCycle(owners[i]);
            }
        }

        // 3. everyone must actually want what they are about to receive
        for (uint256 i = 0; i < n; i++) {
            uint32 target = cycle[(i + 1) % n];
            if (_rank[cycle[i]][target] == 0) revert TargetNotWanted(cycle[i], target);
        }

        // 4. the permutation itself: owner of cycle[i] receives cycle[i+1]
        for (uint256 i = 0; i < n; i++) {
            uint32 given = cycle[i];
            uint32 received = cycle[(i + 1) % n];
            address who = owners[i];

            _removeOwned(who, given);
            _items[received].owner = who;
            _owned[who].push(received);
        }

        // 5. old preferences are meaningless now
        for (uint256 i = 0; i < n; i++) {
            uint32 id = cycle[i];
            uint32[] storage w = _wants[id];
            for (uint256 j = 0; j < w.length; j++) {
                _rank[id][w[j]] = 0;
            }
            delete _wants[id];
        }

        emit CycleExecuted(cycle, owners, n);
    }

    function _removeOwned(address who, uint32 itemId) private {
        uint32[] storage list = _owned[who];
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == itemId) {
                list[i] = list[list.length - 1];
                list.pop();
                return;
            }
        }
    }

    // ------------------------------------------------------------------
    // The Top Trading Cycles invariant
    // ------------------------------------------------------------------

    /// @notice True when every item in the cycle receives its MOST-preferred
    ///         currently-tradeable item.
    /// @dev This is the invariant of Gale's Top Trading Cycles. When it holds,
    ///      the outcome is the TTC outcome, which under strict preferences is
    ///      strategyproof and lies in the strict core (Roth 1982; Ma 1994 showed
    ///      it is the unique rule that is Pareto efficient, strategyproof and
    ///      individually rational).
    ///
    ///      This is NOT a full core check -- verifying the core directly means
    ///      checking every coalition, which is exponential. We do not claim it.
    function verifyTTCStep(uint32[] calldata cycle) external view returns (bool) {
        uint256 n = cycle.length;
        if (n < 2) return false;

        for (uint256 i = 0; i < n; i++) {
            uint32 id = cycle[i];
            if (id == 0 || id > itemCount || !_items[id].active) return false;

            address me = _items[id].owner;
            uint32 target = cycle[(i + 1) % n];

            // first acceptable item on this item's wish list
            uint32 top = 0;
            uint32[] storage w = _wants[id];
            for (uint256 j = 0; j < w.length; j++) {
                uint32 c = w[j];
                if (_items[c].active && _items[c].owner != me) {
                    top = c;
                    break;
                }
            }
            if (top != target) return false;
        }
        return true;
    }

    // ------------------------------------------------------------------
    // Reads
    // ------------------------------------------------------------------

    function getItem(uint32 itemId)
        external
        view
        returns (address owner, uint8 kind, bool active, string memory label)
    {
        Item storage it = _items[itemId];
        return (it.owner, it.kind, it.active, it.label);
    }

    function getItemsOf(address who) external view returns (uint32[] memory) {
        return _owned[who];
    }

    function getWants(uint32 itemId) external view returns (uint32[] memory) {
        return _wants[itemId];
    }

    function rankOf(uint32 itemId, uint32 targetId) external view returns (uint16) {
        return _rank[itemId][targetId];
    }

    /// @notice Whole-state read in ONE rpc call, so the frontend needs no
    ///         Multicall and no per-item round trips.
    /// @return owners  owners[i] is the owner of item id (i+1)
    /// @return kinds   kinds[i] likewise
    /// @return actives actives[i] likewise
    /// @return labels  labels[i] likewise
    /// @return wantsFlat all wish lists concatenated in item order
    /// @return wantsLen  wantsLen[i] = how many entries item (i+1) contributed
    function snapshot()
        external
        view
        returns (
            address[] memory owners,
            uint8[] memory kinds,
            bool[] memory actives,
            string[] memory labels,
            uint32[] memory wantsFlat,
            uint32[] memory wantsLen
        )
    {
        uint32 n = itemCount;
        owners = new address[](n);
        kinds = new uint8[](n);
        actives = new bool[](n);
        labels = new string[](n);
        wantsLen = new uint32[](n);

        uint256 total = 0;
        for (uint32 i = 0; i < n; i++) {
            total += _wants[i + 1].length;
        }
        wantsFlat = new uint32[](total);

        uint256 k = 0;
        for (uint32 i = 0; i < n; i++) {
            uint32 id = i + 1;
            Item storage it = _items[id];
            owners[i] = it.owner;
            kinds[i] = it.kind;
            actives[i] = it.active;
            labels[i] = it.label;

            uint32[] storage w = _wants[id];
            wantsLen[i] = uint32(w.length);
            for (uint256 j = 0; j < w.length; j++) {
                wantsFlat[k++] = w[j];
            }
        }
    }
}
