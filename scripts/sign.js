const { ecsign, ecrecover, pubToAddress, toRpcSig } = require('ethereumjs-util');
const Web3 = require("web3");



const web3 = new Web3(
	new Web3.providers.HttpProvider(
		"http://localhost:8545"
	)
);


async function nftWhiteListSign(privateKey, walletAddr, type) {
	walletAddr = walletAddr.toLowerCase()
	let encodeAbi = web3.eth.abi.encodeParameters(['address', 'uint256'], [walletAddr, type]);
	let keccakHash = web3.utils.keccak256(encodeAbi)
	let signResult = ecsign(Buffer.from(keccakHash.substring(2, keccakHash.length), 'hex'), Buffer.from(privateKey.substring(2, privateKey.length), 'hex'))
	var signedHash = toRpcSig(signResult.v, signResult.r, signResult.s).toString("hex")
	return signedHash

}
module.exports = {
	nftWhiteListSign,
}
    