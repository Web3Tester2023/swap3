// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.8.4;

import {VaultActions} from "./VaultActions.sol";
import {IFactory} from "./interfaces/IFactory.sol";
import {ISwap, Types} from "./airswap/interfaces/ISwap.sol";
import {IAddressBook} from "./gamma/interfaces/IAddressBook.sol";
import {IOracle} from "./gamma/interfaces/IOracle.sol";
import {OtokenInterface} from "./gamma/interfaces/OtokenInterface.sol";
import {Actions, GammaTypes, IController} from "./gamma/interfaces/IController.sol";
import {ERC20Upgradeable} from "../oz/token/ERC20/ERC20Upgradeable.sol";
import {ERC20, IERC20} from "../oz/token/ERC20/ERC20.sol";
import {SafeERC20} from "../oz/token/ERC20/utils/SafeERC20.sol";
import {PausableUpgradeable} from "../oz/security/PausableUpgradeable.sol";

contract VaultToken is ERC20Upgradeable, VaultActions {
    using SafeERC20 for IERC20;

    function initialize(
        string memory _name,
        string memory _symbol,
        address _asset,
        address _manager,
        address _addressBook,
        address _factory,
        uint256 _withdrawalWindowLength,
        uint256 _maximumAssets
    ) external initializer {
        __ERC20_init_unchained(_name, _symbol);
        asset = _asset;
        manager = _manager;
        addressBook = IAddressBook(_addressBook);
        factory = IFactory(_factory);
        withdrawalWindowLength = _withdrawalWindowLength;
        maximumAssets = _maximumAssets;
    }
    
    /// @notice Deposit assets and receive vault tokens to represent a share
    /// @dev Deposits an amount of assets specified then mints vault tokens to the msg.sender
    /// @param _amount amount to deposit of ASSET
    function deposit(uint256 _amount) external ifNotClosed nonReentrant() whenNotPaused() {
        _deposit(_amount, address(0), 0);
    }

    function discountDeposit(uint256 _amount, address _waiver, uint256 _waiverId) external ifNotClosed nonReentrant() whenNotPaused() {
        _deposit(_amount, _waiver, _waiverId);
    }

    /// @notice Redeem vault tokens for assets
    /// @dev Burns vault tokens in redemption for the assets to msg.sender
    /// @param _amount amount of VAULT TOKENS to burn
    function withdraw(uint256 _amount) external nonReentrant() whenNotPaused() {
        _withdraw(_amount, address(0), 0);
    }

    function discountWithdraw(uint256 _amount, address _waiver, uint256 _waiverId) external ifNotClosed nonReentrant() whenNotPaused() {
        _withdraw(_amount, _waiver, _waiverId);
    }

    /// @notice Write options for an _amount of asset for the specified oToken
    /// @dev Allows the manager to write options for an x 
    /// @param _amount amount of the asset to deposit as collateral
    /// @param _oToken address of the oToken
    function writeOptions(uint256 _amount, address _oToken) external ifNotClosed onlyManager nonReentrant() whenNotPaused() {
        _writeOptions(_amount, _oToken);
    }

    /// @notice Write options for a _percentage of the current balance of the vault
    /// @dev Uses percentage of the vault instead of a specific number (helpful for multi-sigs)
    /// @param _percentage A uint16 representing up to 10000 (100.00%) with two decimals of precision for the amount of asset tokens to write
    /// @param _oToken address of the oToken
    function writeOptions(uint16 _percentage, address _oToken) external ifNotClosed onlyManager nonReentrant() whenNotPaused() {
        if(_percentage > 10000)
            revert Invalid();

        if(_percentage > 10000 - withdrawalReserve)
            _percentage -= _percentage - (10000 - withdrawalReserve);
        
        _writeOptions(
            _percentMultiply(
                IERC20(asset).balanceOf(address(this)) - currentReserves - obligatedFees, _percentage
            ),
            _oToken
        );
    }

    /// @notice Operation to sell options to an EXISTING order on AirSwap (via off-chain signature)
    /// @dev Sells options via AirSwap that exists by the counterparty grabbed off-chain
    /// @param _order AirSwap order details
    function sellOptions(Types.Order memory _order) external ifNotClosed onlyManager nonReentrant() whenNotPaused() {
        _sellOptions(_order);
    }

    /// @notice Operation to both write AND sell options
    /// @dev Operation that can handle both the `writeOptions()` and `sellOptions()` at the same time
    /// @param _amount Amount of the asset token to collateralize the option
    /// @param _oToken Address of the oToken to write with
    /// @param _order AirSwap order
    function writeAndSellOptions(
        uint256 _amount,
        address _oToken,
        Types.Order memory _order
    ) external ifNotClosed onlyManager nonReentrant() whenNotPaused() {
        _writeOptions(
            _amount,
            _oToken
        );
        _sellOptions(
            _order
        );
    }

    /// @notice Operation to both write AND sell options
    /// @dev Operation that can handle both the `writeOptions()` and `sellOptions()` at the same time
    /// @param _percentage Percentage of the available asset tokens to write and sell
    /// @param _oToken Address of the oToken to write with
    /// @param _order AirSwap order
    function writeAndSellOptions(
        uint16 _percentage,
        address _oToken,
        Types.Order memory _order
    ) external ifNotClosed onlyManager nonReentrant() whenNotPaused() {
        if(_percentage > 10000 - withdrawalReserve)
            _percentage -= _percentage - (10000 - withdrawalReserve);

        _writeOptions(
            _percentMultiply(
                IERC20(asset).balanceOf(address(this)) - obligatedFees,
                _percentage
            ),
            _oToken
        );
        _sellOptions(_order);
    }

    function _writeOptions(uint256 _amount, address _oToken) internal {
        if(!_withdrawalWindowCheck(false))
            revert WithdrawalWindowActive();
        if(_amount == 0 || _oToken == address(0))
            revert Invalid();
        if(_amount > IERC20(asset).balanceOf(address(this)) - obligatedFees)
            revert NotEnoughFunds();
        if(_oToken != oToken && oToken != address(0))
            revert oTokenNotCleared();

        // Verify option is not too deep ITM
        if(OtokenInterface(_oToken).isPut()) {
            if(
                OtokenInterface(_oToken).strikePrice() < _percentMultiply(IOracle(addressBook.getOracle()).getPrice(OtokenInterface(_oToken).underlyingAsset()), 10000 - 500)
            ) {
                revert Invalid_StrikeTooDeepITM();
            }
        } else {
            if(
                OtokenInterface(_oToken).strikePrice() > _percentMultiply(IOracle(addressBook.getOracle()).getPrice(OtokenInterface(_oToken).underlyingAsset()), 10000 + 500)
            ) {
                    revert Invalid_StrikeTooDeepITM();
            }
        }

        // Calculate reserves if not already done
        if(oToken == address(0))
            _calculateAndSetReserves();

        // Check if the _amount exceeds the reserves
        if(_amount > IERC20(asset).balanceOf(address(this)) - obligatedFees - currentReserves)
            revert NotEnoughFunds_ReserveViolation();

        Actions.ActionArgs[] memory actions;
        GammaTypes.Vault memory vault;

        IController controller = IController(addressBook.getController());

        // Check if the vault is even open and open if no vault is open
        vault = controller.getVault(address(this), currentVaultId);
        if(
            vault.shortOtokens.length == 0 &&
            vault.collateralAssets.length == 0
        ) {
            actions = new Actions.ActionArgs[](3);
            currentVaultId = controller.getAccountVaultCounter(address(this)) + 1;

            actions[0] = Actions.ActionArgs(
                Actions.ActionType.OpenVault,
                address(this),
                address(this),
                address(0),
                currentVaultId,
                0,
                0,
                ""
            );
            
        } else {
            actions = new Actions.ActionArgs[](2);
        }

        // Deposit _amount of asset to the vault
        actions[actions.length - 2] = Actions.ActionArgs(
                Actions.ActionType.DepositCollateral,
                address(this),
                address(this),
                asset,
                currentVaultId,
                _amount,
                0,
                ""
            );
        // Determine the amount of options to write
        uint256 oTokensToWrite;

        if(OtokenInterface(_oToken).isPut()) {
            oTokensToWrite = _normalize(_amount, ERC20(asset).decimals(), 16) / OtokenInterface(_oToken).strikePrice();
        } else {
            oTokensToWrite = _normalize(_amount, ERC20(asset).decimals(), 8);
        }

        // Write options
        actions[actions.length - 1] = Actions.ActionArgs(
                Actions.ActionType.MintShortOption,
                address(this),
                address(this),
                _oToken,
                currentVaultId,
                oTokensToWrite,
                0,
                ""
            );
        // Approve the tokens to be moved
        IERC20(asset).approve(addressBook.getMarginPool(), _amount);
        
        // Submit the operations to the controller contract
        controller.operate(actions);

        collateralAmount += _amount;
        if(oToken != _oToken)
            oToken = _oToken;

        emit OptionsMinted(_amount, oToken, controller.getAccountVaultCounter(address(this)));
    }

    function _deposit(uint256 _amount, address _waiver, uint256 _waiverId) internal {
        if(_amount == 0)
            revert Invalid();
        
        uint256 adjustedBal;
        uint256 vaultMint;

        (uint256 protocolFees, uint256 vaultFees) = _calculateFees(_amount, factory.depositFee(), depositFee, _waiver, _waiverId, true);

        // Check if the total supply is zero
        if(totalSupply() == 0) {
            vaultMint = _normalize(_amount - protocolFees - vaultFees, ERC20(asset).decimals(), decimals());
            if(_amount - obligatedFees - withheldProtocolFees > maximumAssets)
                revert MaximumFundsReached();

            withdrawalWindowExpires = block.timestamp + withdrawalWindowLength;
        } else {
            adjustedBal = collateralAmount + IERC20(asset).balanceOf(address(this)) - obligatedFees - withheldProtocolFees;

            if(adjustedBal + _amount > maximumAssets)
                revert MaximumFundsReached();

            vaultMint = totalSupply() * (_amount - protocolFees - vaultFees) / (adjustedBal);
        }

        if(vaultMint == 0) // Safety check for rounding errors
            revert Invalid();
        if(protocolFees > 0) {
            withheldProtocolFees += protocolFees;
        }
        if(vaultFees > 0) {
            obligatedFees += vaultFees;
        }
        IERC20(asset).safeTransferFrom(msg.sender, address(this), _amount);
        _mint(msg.sender, vaultMint);

        emit Deposit(_amount, vaultMint);
    }

    function _withdraw(uint256 _amount, address _waiver, uint256 _waiverId) internal {
        if(_amount == 0)
            revert Invalid();

        uint256 assetAmount = _amount * (IERC20(asset).balanceOf(address(this)) + collateralAmount - premiumsWithheld - obligatedFees - withheldProtocolFees) / totalSupply();
        (uint256 protocolFee, uint256 vaultFee) = _calculateFees(assetAmount, factory.withdrawalFee(), withdrawalFee, _waiver, _waiverId, false);
        
        withheldProtocolFees += protocolFee;
        obligatedFees += vaultFee;

        assetAmount = _calculatePenalty(assetAmount);

        assetAmount -= (protocolFee + vaultFee);

        // Safety check
        if(assetAmount == 0)
            revert Invalid();

        // (Reserve) safety check
        if(_withdrawalWindowCheck(false) && oToken != address(0)) {
            if(assetAmount > currentReserves)
                revert NotEnoughFunds_ReserveViolation();
            else
                currentReserves -= assetAmount;
        }

        IERC20(asset).safeTransfer(msg.sender, assetAmount); // Vault Token Amount to Burn * Balance of Vault for Asset  / Total Vault Token Supply
        _burn(address(msg.sender), _amount);

        emit Withdrawal(assetAmount, _amount);
    }

    function _calculateAndSetReserves() internal {
        currentReserves = _percentMultiply(IERC20(asset).balanceOf(address(this)) - obligatedFees, withdrawalReserve);
    }

}