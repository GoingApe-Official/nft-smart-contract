// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/*
░██████╗░░█████╗░██╗███╗░░██╗░██████╗░  ░█████╗░██████╗░███████╗
██╔════╝░██╔══██╗██║████╗░██║██╔════╝░  ██╔══██╗██╔══██╗██╔════╝
██║░░██╗░██║░░██║██║██╔██╗██║██║░░██╗░  ███████║██████╔╝█████╗░░
██║░░╚██╗██║░░██║██║██║╚████║██║░░╚██╗  ██╔══██║██╔═══╝░██╔══╝░░
╚██████╔╝╚█████╔╝██║██║░╚███║╚██████╔╝  ██║░░██║██║░░░░░███████╗
░╚═════╝░░╚════╝░╚═╝╚═╝░░╚══╝░╚═════╝░  ╚═╝░░╚═╝╚═╝░░░░░╚══════╝
*/
contract GoingApeSigVerifyNft is ERC721A, Ownable, ReentrancyGuard {
    using Strings for uint256;

    string public baseURI;
    // sale state
    bool public publicSaleIsActive = false;
    bool public whitelistSaleisActive = false;
    bool public privateSaleisActive = false;
    // price
    uint256 public publicSaleCost = 0.1 ether;
    uint256 public whitelistSaleCost = 0.08 ether;
    uint256 public privateSaleCost = 0.08 ether;

    uint256 public immutable maxSupply = 10000;
    uint256 public immutable privateSaleSupply = 1000;
    uint256 public immutable reserveSupply = 3027;

    uint256 public tokensReserved;
    uint256 public privateSales;

    address private signer;

    mapping(address => uint256) public whitelistSaleMints;
    mapping(address => uint256) public privateSaleMints;
    mapping(address => uint256) public publicSaleMints;

    uint256 public constant MAX_WHITELIST_MINT = 1;
    uint256 public constant MAX_PRIVATE_MINT = 10;
    uint256 public constant MAX_PUBLIC_MINT = 5;

    string public PROVENANCE = "";

    event PublicCostChanged(uint256 newCost);
    event WhitelistSaleCostChanged(uint256 newCost);
    event PrivateSaleCostChanged(uint256 newCost);

    constructor(
        string memory _name,
        string memory _symbol,
        address _signer
    ) ERC721A(_name, _symbol) {
        signer = _signer;
    }

    // internal
    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    // public
    function publicMint(uint256 _mintAmount) external payable nonReentrant {
        uint256 supply = totalSupply();
        require(publicSaleIsActive, "public sale not open");
        require(tx.origin == msg.sender, "contract is not allowed to mint");
        require(_mintAmount > 0, "mint num must > 0");
        require(
            supply + _mintAmount + reserveSupply - tokensReserved <= maxSupply,
            "cap reached"
        );
        require(
            _mintAmount + publicSaleMints[msg.sender] <= MAX_PUBLIC_MINT,
            "public mint amount per wallet exceeded"
        );
        refundIfOver(publicSaleCost * _mintAmount);
        publicSaleMints[msg.sender] += _mintAmount;
        _safeMint(msg.sender, _mintAmount);
    }

    function refundIfOver(uint256 price) private {
        require(msg.value >= price, "Need to send more ETH");
        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }
    }

    function whitelistSaleMint(uint256 _mintAmount, bytes memory _signature)
        external
        payable
        nonReentrant
    {
        uint256 supply = totalSupply();
        require(whitelistSaleisActive, "whitelist sale not open");
        require(tx.origin == msg.sender, "contract is not allowed to mint");
        require(_mintAmount > 0, "mint num must > 0");
        require(
            supply + _mintAmount + reserveSupply - tokensReserved <= maxSupply,
            "cap reached"
        );
        require(
            _mintAmount + whitelistSaleMints[msg.sender] <= MAX_WHITELIST_MINT,
            "whitelist mint amount per wallet exceeded"
        );

        address signerOwner = signatureWallet(msg.sender, 1, _signature);
        require(signerOwner == signer, "Not authorized to mint");
        refundIfOver(whitelistSaleCost * _mintAmount);

        whitelistSaleMints[msg.sender] += _mintAmount;
        _safeMint(msg.sender, _mintAmount);
    }

    function privateSaleMint(uint256 _mintAmount, bytes memory _signature)
        external
        payable
        nonReentrant
    {
        uint256 supply = totalSupply();
        require(privateSaleisActive, "private sale not open");
        require(tx.origin == msg.sender, "contract is not allowed to mint");
        require(_mintAmount > 0, "mint num must > 0");
        require(
            privateSales + _mintAmount <= privateSaleSupply,
            "private sale cap reached"
        );
        require(
            supply + _mintAmount + reserveSupply - tokensReserved <= maxSupply,
            "cap reached"
        );
        require(
            _mintAmount + privateSaleMints[msg.sender] <= MAX_PRIVATE_MINT,
            "private sale mint amount per wallet exceeded"
        );

        address signerOwner = signatureWallet(msg.sender, 0, _signature);
        require(signerOwner == signer, "Not authorized to mint");
        refundIfOver(privateSaleCost * _mintAmount);
        privateSaleMints[msg.sender] += _mintAmount;
        privateSales += _mintAmount;

        _safeMint(msg.sender, _mintAmount);
    }

    function signatureWallet(
        address _wallet,
        uint256 _saleType,
        bytes memory _signature
    ) public pure returns (address) {
        return
            ECDSA.recover(
                keccak256(abi.encode(_wallet, _saleType)),
                _signature
            );
    }

    function numberMinted(address owner) external view returns (uint256) {
        return _numberMinted(owner);
    }

    function getOwnershipData(uint256 tokenId)
        external
        view
        returns (TokenOwnership memory)
    {
        return ownershipOf(tokenId);
    }

    //only owner
    function setPublicCost(uint256 _newCost) external onlyOwner {
        publicSaleCost = _newCost;
        emit PublicCostChanged(_newCost);
    }

    function setWhitelistSaleCost(uint256 _newCost) external onlyOwner {
        whitelistSaleCost = _newCost;
        emit WhitelistSaleCostChanged(_newCost);
    }

    function setPrivateSaleCost(uint256 _newCost) external onlyOwner {
        privateSaleCost = _newCost;
        emit PrivateSaleCostChanged(_newCost);
    }

    function setProvenanceHash(string memory _provenanceHash)
        external
        onlyOwner
    {
        PROVENANCE = _provenanceHash;
    }

    function setBaseURI(string memory _newBaseURI) external onlyOwner {
        baseURI = _newBaseURI;
    }

    function setPublicSaleState(bool _newState) external onlyOwner {
        publicSaleIsActive = _newState;
    }

    function setWhitelistSaleState(bool _newState) external onlyOwner {
        whitelistSaleisActive = _newState;
    }

    function setPrivateSaleState(bool _newState) external onlyOwner {
        privateSaleisActive = _newState;
    }

    function setSigner(address _newSigner) external onlyOwner {
        signer = _newSigner;
    }

    function reserve(uint256 _n, address _receiver) external onlyOwner {
        uint256 supply = totalSupply();
        require(_receiver != address(0), "not zero address");
        require(_n > 0, "not zero amount");
        require(supply + _n <= maxSupply, "cap reached");
        require(
            tokensReserved + _n <= reserveSupply,
            "max reserve amount exceeded"
        );
        tokensReserved += _n;
        _safeMint(_receiver, _n);
    }

    function withdrawBalance(uint256 _amount) external onlyOwner {
        require(_amount <= address(this).balance, "withdraw amount too large");
        payable(msg.sender).transfer(_amount);
    }
}
