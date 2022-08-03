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

contract Ownable {
    address public owner;

    event OwnershipTransferred(
        address indexed _previousOwner,
        address indexed _newOwner
    );

    constructor(address _owner) {
        _transferOwnership(_owner);
    }

    modifier onlyOwner() {
        require(owner == msg.sender, "not owner");
        _;
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        _transferOwnership(_newOwner);
    }

    function _transferOwnership(address _newOwner) private {
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }
}
