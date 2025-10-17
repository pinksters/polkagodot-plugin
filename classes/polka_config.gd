extends Resource
class_name PolkaConfig

@export_group("General Settings")
@export var debug_mode: bool = false
@export var game_id: String = ""
@export var ipfs_gateway: String = "https://ipfs.io/ipfs/"

@export_group("Chain Configuration")
@export var chain_id: int = 0
@export var chain_name: String = ""
@export var currency_name: String = ""
@export var currency_symbol: String = ""
@export var currency_decimals: int = 18
@export var rpc_url: String = ""
@export var block_explorer_url: String = ""

@export_group("Contract Addresses")
@export var game_manager_contract: String = ""
@export var nft_contract: String = ""


func get_chain_id_hex() -> String:
	return "0x%x" % chain_id


func get_chain_config_json() -> String:
	return JSON.stringify({
		"chainId": get_chain_id_hex(),
		"chainName": chain_name,
		"nativeCurrency": {
			"name": currency_name,
			"symbol": currency_symbol,
			"decimals": currency_decimals
		},
		"rpcUrls": [rpc_url],
		"blockExplorerUrls": [block_explorer_url]
	})
