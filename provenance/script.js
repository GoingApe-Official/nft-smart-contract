const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const provenanceGen = async () => {
	const dir = path.join(__dirname, './images');
	const files = fs.readdirSync(dir)
	let concatenatedHash =""

	for (let index = 0; index < files.length; index++) {
		const iamgeName = files[index];
		console.log(`iamgeName`, iamgeName)
		let imgBuffer = fs.readFileSync(path.join(dir, iamgeName));
		let hash = crypto.createHash('sha256').update(imgBuffer).digest('hex');
		console.log(`image hash`, hash)
		concatenatedHash = `${concatenatedHash}${hash}`
	}
	console.log(`concatenatedHash: \n${concatenatedHash}`)
};



provenanceGen();
