# PolkaGodot - Web3 functionality for Godot games
# This singleton provides wallet connections, message signing, and NFT queries

extends Node

signal wallet_connected(address: String)
signal wallet_disconnected()
signal wallet_connection_failed(error: String)

signal message_signed(signature: String)
signal message_sign_failed(error: String)

signal nfts_queried(result: Dictionary)
signal nft_query_failed(error: String)

var js_interface: JavaScriptObject = null

var _callback_wallet_connected: JavaScriptObject
var _callback_wallet_disconnected: JavaScriptObject
var _callback_message_signed: JavaScriptObject
var _callback_nfts_queried: JavaScriptObject

var is_connected: bool = false
var current_address: String = ""
var debug_mode: bool = true

func _ready():
	if OS.has_feature("web"):
		js_interface = JavaScriptBridge.get_interface("PolkaInterface")
		
		if js_interface:
			_callback_wallet_connected = JavaScriptBridge.create_callback(_on_wallet_connected)
			_callback_wallet_disconnected = JavaScriptBridge.create_callback(_on_wallet_disconnected)
			_callback_message_signed = JavaScriptBridge.create_callback(_on_message_signed)
			_callback_nfts_queried = JavaScriptBridge.create_callback(_on_nfts_queried)
			
			_log("PolkaGodot initialized with web interface")
		else:
			push_error("PolkaGodot: Failed to get PolkaInterface from JavaScript")
	else:
		_log("PolkaGodot: Not running in web environment")


func _log(message: String):
	if debug_mode:
		print("[PolkaGodot] " + message)


func has_ethereum_provider() -> bool:
	if js_interface:
		return bool(js_interface.hasEthereumProvider())
	return false


func connect_wallet() -> void:
	if not js_interface:
		wallet_connection_failed.emit("No JavaScript interface available")
		return
	
	_log("Attempting to connect wallet...")
	js_interface.connectWallet().then(_callback_wallet_connected)


func disconnect_wallet() -> void:
	if not js_interface:
		return
	
	_log("Disconnecting wallet...")
	js_interface.disconnectWallet().then(_callback_wallet_disconnected)


func get_wallet_address() -> String:
	if not js_interface:
		return ""
	return str(js_interface.getCurrentWalletAddress())


func is_wallet_connected() -> bool:
	if not js_interface:
		return false
	return bool(js_interface.isWalletConnected())


func sign_message(message: String) -> void:
	if not js_interface:
		message_sign_failed.emit("No JavaScript interface available")
		return
	
	if not is_wallet_connected():
		message_sign_failed.emit("Wallet not connected")
		return
	
	_log("Signing message: " + message)
	js_interface.signMessage(message).then(_callback_message_signed)


func store_signature(wallet_address: String, signature: String) -> void:
	if js_interface:
		js_interface.storeSignature(wallet_address, signature)


func store_auth_key(wallet_address: String, auth_key: String) -> void:
	if js_interface:
		js_interface.storeAuthKey(wallet_address, auth_key)


func load_signature(wallet_address: String) -> String:
	if js_interface:
		return str(js_interface.loadSignature(wallet_address))
	return ""


func load_auth_key(wallet_address: String) -> String:
	if js_interface:
		return str(js_interface.loadAuthKey(wallet_address))
	return ""


# Query NFTs from a contract
# Options: user_address, from_token_id, to_token_id, batch_size, ipfs_gateway, cors_proxy, rpc_url
func query_nfts(contract_address: String, contract_abi: Array, options: Dictionary = {}) -> void:
	if not js_interface:
		nft_query_failed.emit("No JavaScript interface available")
		return
	
	if contract_address.is_empty() or contract_abi.is_empty():
		nft_query_failed.emit("Contract address and ABI are required")
		return
	
	if not options.has("user_address") and is_wallet_connected():
		options["user_address"] = get_wallet_address()
	
	_log("Querying NFTs from contract: " + contract_address)
	_log("With options: " + str(options))
	
	var abi_json = JSON.stringify(contract_abi)
	var options_json = JSON.stringify(options)
	
	_log("ABI JSON: " + abi_json.substr(0, 100) + "...")
	_log("Options JSON: " + options_json)
	
	var error_callback = JavaScriptBridge.create_callback(func(args):
		_log("NFT query promise rejected")
		if args.size() > 0:
			_log("Error: " + str(args[0]))
			nft_query_failed.emit(str(args[0]))
		else:
			nft_query_failed.emit("Unknown error in NFT query")
	)
	
	js_interface.queryNFTs(contract_address, abi_json, options_json).then(_callback_nfts_queried).catch(error_callback)


func _on_wallet_connected(args: Array):
	var success = false
	if args.size() > 0:
		success = bool(args[0])
	
	if success:
		current_address = get_wallet_address()
		is_connected = true
		_log("Wallet connected: " + current_address)
		wallet_connected.emit(current_address)
	else:
		is_connected = false
		current_address = ""
		_log("Wallet connection failed")
		wallet_connection_failed.emit("Failed to connect wallet")


func _on_wallet_disconnected(args: Array):
	is_connected = false
	current_address = ""
	_log("Wallet disconnected")
	wallet_disconnected.emit()


func _on_message_signed(args: Array):
	if args.is_empty():
		_log("Message signing failed: No signature received")
		message_sign_failed.emit("No signature received")
		return
	
	var signature = str(args[0])
	if signature == "null" or signature.is_empty():
		_log("Message signing failed: Invalid signature")
		message_sign_failed.emit("Invalid signature")
		return
	
	_log("Message signed successfully")
	message_signed.emit(signature)


func _on_nfts_queried(args: Array):
	_log("NFT query callback received with " + str(args.size()) + " arguments")
	
	if args.is_empty():
		_log("NFT query failed: No result received")
		nft_query_failed.emit("No result received")
		return
	
	var result = args[0]
	_log("Result type: " + str(typeof(result)))
	
	if result == null:
		_log("NFT query failed: Null result")
		nft_query_failed.emit("Null result received")
		return
	
	var result_dict: Dictionary = {}
	if result is String:
		var json = JSON.new()
		var parse_result = json.parse(result)
		if parse_result == OK:
			result_dict = json.data
			_log("Successfully parsed JSON result")
		else:
			_log("Failed to parse JSON result: " + json.get_error_message())
			nft_query_failed.emit("Failed to parse JSON response")
			return
	elif result is Dictionary:
		result_dict = result
	else:
		_log("Unexpected result type: " + str(typeof(result)))
		nft_query_failed.emit("Unexpected result type from JavaScript")
		return
	
	if result_dict.has("error") and result_dict.error:
		_log("NFT query failed: " + str(result_dict.error))
		nft_query_failed.emit(str(result_dict.error))
	else:
		_log("NFT query successful: Found " + str(result_dict.get("tokenCount", 0)) + " tokens")
		nfts_queried.emit(result_dict)


static func get_erc721_abi() -> Array:
	return [
		{
			"constant": true,
			"inputs": [{"name": "owner", "type": "address"}],
			"name": "balanceOf",
			"outputs": [{"name": "", "type": "uint256"}],
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [{"name": "tokenId", "type": "uint256"}],
			"name": "ownerOf",
			"outputs": [{"name": "", "type": "address"}],
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [{"name": "tokenId", "type": "uint256"}],
			"name": "tokenURI",
			"outputs": [{"name": "", "type": "string"}],
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "totalSupply",
			"outputs": [{"name": "", "type": "uint256"}],
			"type": "function"
		}
	]
