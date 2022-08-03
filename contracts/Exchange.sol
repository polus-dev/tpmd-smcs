// SPDX-License-Identifier: AGPL-3.0-only

/*
    tpmd-smcs (team promise distributor smart contracts)
    Copyright (C) 2022 polus <https://github.com/polus-dev>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity ^0.8.0;

import "./utils/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

library Errors {
    string constant NOT_INITED = "not initialized";

    string constant TOKEN0_SET = "token0 is already set";
    string constant TOKEN1_SET = "token1 is already set";

    string constant INV_AMOUNT = "require: amount > 0";
    string constant INV_ALLOWN = "require: allowance >= amount";

    string constant SORRY_BALC = "insufficient balance token1";
}

// Exchange 1:1 (_token0 -> _token1)

contract Exchange is Ownable {
    bool private _token0Inited;
    bool private _token1Inited;

    IERC20 public _token0;
    IERC20 public _token1;

    constructor(address owner) Ownable(owner) {}

    event SetUpToken(address token, uint8 tokenType);
    event Exchanged(address indexed by, uint256 amount, uint256 timestamp);

    function setToken0(address tokenAddress) external onlyOwner {
        require(address(_token0) == address(0), Errors.TOKEN0_SET);

        _token0 = IERC20(tokenAddress);
        _token0Inited = true;
        emit SetUpToken(tokenAddress, 0);
    }

    function setToken1(address tokenAddress) external onlyOwner {
        require(address(_token1) == address(0), Errors.TOKEN1_SET);

        _token1 = IERC20(tokenAddress);
        _token1Inited = true;
        emit SetUpToken(tokenAddress, 1);
    }

    function exchange(uint256 amount) external {
        require(_token0Inited && _token1Inited, Errors.NOT_INITED);
        require(amount > 0, Errors.INV_AMOUNT);
        require(_token1.balanceOf(address(this)) >= amount, Errors.SORRY_BALC);

        uint256 allowance = _token0.allowance(msg.sender, address(this));
        require(allowance >= amount, Errors.INV_ALLOWN);

        _token0.transferFrom(msg.sender, address(this), amount);
        _token1.transfer(msg.sender, amount);

        emit Exchanged(msg.sender, amount, block.timestamp);
    }
}
