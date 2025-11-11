// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NiftyNFT is ERC721URIStorage, Ownable {
    uint256 private _tokenIds;

    constructor() ERC721("NiftyNFT", "NIFTY") {}

    function safeMint(address to, string memory uri) public onlyOwner returns (uint256) {
        _tokenIds++;
        uint256 newId = _tokenIds;
        _safeMint(to, newId);
        _setTokenURI(newId, uri);
        return newId;
    }
}
