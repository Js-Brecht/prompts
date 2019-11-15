export function HasKey<O>(obj: O, key: keyof any): key is keyof O {
	return key in obj;
}

export default HasKey;
