// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.0;

contract Whitelist {
    /**
     * @dev Mapping of whitelisted addresses as required
     */
    mapping(address => bool) public whitelisted;
    /**
     * @dev Address of the admin
     */
    address public admin;

    event WhitelistAdded(address);
    event WhitelistRevoked(address);
    event AdminChanged(address);

    constructor(address _admin) {
        require(
            admin != address(0),
            "Zero address"
        );
        admin = _admin;
    }

    modifier onlyAdmin {
        _onlyAdmin();
        _;
    }
    function addWhitelist(address _add) external onlyAdmin {
        require(
            !whitelisted[_add],
            "Already whitelisted"
        );
        require(
            _add != address(0),
            "Zero address"
        );
        whitelisted[_add] = true;
    }
    function revokeWhitelist(address _revoke) external onlyAdmin {
        require(
            whitelisted[_revoke],
            "Not whitelisted"
        );
        require(
            _revoke != address(0),
            "Zero address"
        );
        whitelisted[_revoke] = false;
    }
    function changeAdmin(address _admin) external onlyAdmin {
        require(
            _admin != address(0),
            "Zero address"
        );
        admin = _admin;
    }
    function isWhitelisted(address _address) external view returns(bool) {
        return whitelisted[_address];
    }
    function _onlyAdmin() internal view {
        require(
            msg.sender == admin,
            "Not authorized"
        );
    }
}