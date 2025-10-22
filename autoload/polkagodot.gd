# PolkaGodot - Web3 functionality for Godot games

extends Node

signal wallet_connected(address: String)
signal wallet_disconnected()
signal wallet_connection_failed(error: String)

signal message_signed(signature: String)
signal message_sign_failed(error: String)

signal nfts_queried(result: Dictionary)
signal nft_query_failed(error: String)
signal user_nfts_fetched(nfts: Array)
signal nft_equipped(nft: NFT)
signal nft_equip_failed(error: String)
signal nft_unequipped()
signal nft_unequip_failed(error: String)
signal equipped_nft_loaded(nft_id: int)
signal chain_switched(chain_id: String)
signal chain_switch_failed(error: String)

var config: PolkaConfig = null
var js_interface: JavaScriptObject = null

var _callback_wallet_connected: JavaScriptObject
var _callback_wallet_disconnected: JavaScriptObject
var _callback_message_signed: JavaScriptObject
var _callback_nfts_queried: JavaScriptObject
var _callback_nft_equipped: JavaScriptObject
var _callback_nft_unequipped: JavaScriptObject
var _callback_equipped_nft_queried: JavaScriptObject

var is_connected: bool = false
var current_address: String = ""
var current_wallet_id: String = ""
var available_accounts: Array = []
var discovered_wallets: Array = []

var wallet_management_screen: CanvasLayer = null
var asset_management_screen: CanvasLayer = null

# Local user's assets
var user_nfts: Array[NFT] = []
var is_fetching_nfts: bool = false
var equipped_nft_id: int = 0
var equipped_nft: NFT = null

func _init() -> void:
	_load_config()
	
	if OS.has_feature("web"):
		js_interface = JavaScriptBridge.get_interface("PolkaInterface")
		
		if js_interface:
			_callback_wallet_connected = JavaScriptBridge.create_callback(_on_wallet_connected)
			_callback_wallet_disconnected = JavaScriptBridge.create_callback(_on_wallet_disconnected)
			_callback_message_signed = JavaScriptBridge.create_callback(_on_message_signed)
			_callback_nfts_queried = JavaScriptBridge.create_callback(_on_nfts_queried)
			_callback_nft_equipped = JavaScriptBridge.create_callback(_on_nft_equipped)
			_callback_nft_unequipped = JavaScriptBridge.create_callback(_on_nft_unequipped)
			_callback_equipped_nft_queried = JavaScriptBridge.create_callback(_on_equipped_nft_queried)

			_log("PolkaGodot initialized with web interface")
		else:
			push_error("PolkaGodot: Failed to get PolkaInterface from JavaScript")
	else:
		_log("PolkaGodot: Not running in web environment")


func _load_config() -> void:
	var dir = DirAccess.open("res://")
	dir.list_dir_begin()
	while true:
		var filename: String = dir.get_next()
		if filename.strip_edges().is_empty():
			break
		
		for extension in ["res", "tres", "res.import", "tres.import", "res.remap", "tres.remap"]:
			if filename.ends_with(extension):
				var clean_filename: String = filename.trim_suffix(".import").trim_suffix(".remap")
				var loaded_res = load(clean_filename)
				if loaded_res is PolkaConfig:
					config = loaded_res
					_log("User config found: %s" % clean_filename)
					return

	var default_config = load("res://addons/polkagodot/config.tres")
	if default_config is PolkaConfig:
		config = default_config
		_log("Loaded default config.")
		return
	
	config = PolkaConfig.new()
	_log("WARNING: No configuration file found. The extension will not work without a valid configuration.")


func _log(message: String):
	if config.debug_mode:
		print("[PolkaGodot] " + message)


func has_ethereum_provider() -> bool:
	if js_interface:
		return bool(js_interface.hasEthereumProvider())
	return false


func connect_wallet(wallet_id: String = "") -> void:
	if not js_interface:
		wallet_connection_failed.emit("No JavaScript interface available")
		return

	_log("Attempting to connect wallet: " + wallet_id if wallet_id else "Attempting to connect wallet...")
	js_interface.connectWallet(wallet_id).then(_callback_wallet_connected)


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
		available_accounts = get_available_accounts()
		var wallet_info = get_current_wallet_info()
		if wallet_info and wallet_info.has("id"):
			current_wallet_id = wallet_info.id
		_log("Wallet connected: " + current_address + " (" + current_wallet_id + ")")
		wallet_connected.emit(current_address)

		# Automatically fetch local user's NFTs as soon as wallet connects
		fetch_user_nfts()
		await user_nfts_fetched
		query_equipped_nft()
	else:
		is_connected = false
		current_address = ""
		current_wallet_id = ""
		available_accounts = []
		_log("Wallet connection failed")
		wallet_connection_failed.emit("Failed to connect wallet")


func _on_wallet_disconnected(args: Array):
	is_connected = false
	current_address = ""
	current_wallet_id = ""
	available_accounts = []
	user_nfts.clear()
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

	if result is not String:
		_log("ERROR: Expected String from JavaScript, got " + str(typeof(result)))
		nft_query_failed.emit("Invalid type received from JavaScript")
		return

	var json = JSON.new()
	var parse_result = json.parse(result)
	if parse_result != OK:
		_log("Failed to parse JSON result: " + json.get_error_message())
		nft_query_failed.emit("Failed to parse JSON response")
		return

	var result_dict: Dictionary = json.data
	if result_dict.has("error") and result_dict.error:
		_log("NFT query failed: " + str(result_dict.error))
		nft_query_failed.emit(str(result_dict.error))
	else:
		_log("NFT query successful: Found " + str(result_dict.get("tokenCount", 0)) + " tokens")
		nfts_queried.emit(result_dict)


func show_wallet_management_screen():
	if wallet_management_screen != null:
		return
	
	wallet_management_screen = load("res://addons/polkagodot/ui/wallet_management_screen/wallet_management_screen.tscn").instantiate()
	get_tree().root.add_child(wallet_management_screen)
	wallet_management_screen.closed.connect(_on_wallet_management_screen_closed)
	wallet_management_screen.show_screen()

	_log("Showing wallet management screen")


func _on_wallet_management_screen_closed():
	wallet_management_screen = null
	_log("Wallet management screen closed")


func get_discovered_wallets() -> Array:
	if not js_interface:
		return []

	var wallets_json = js_interface.getDiscoveredWallets()
	if wallets_json:
		var json = JSON.new()
		var parse_result = json.parse(wallets_json)
		if parse_result == OK:
			discovered_wallets = json.data
			return discovered_wallets
	return []


func get_accounts_for_wallet(wallet_id: String) -> Array:
	if not js_interface:
		return []

	var accounts_json = js_interface.getAccountsForWallet(wallet_id)
	if accounts_json:
		var json = JSON.new()
		var parse_result = json.parse(accounts_json)
		if parse_result == OK:
			return json.data
	return []


func get_available_accounts() -> Array:
	if not js_interface:
		return []

	var accounts_json = js_interface.getAvailableAccounts()
	if accounts_json:
		var json = JSON.new()
		var parse_result = json.parse(accounts_json)
		if parse_result == OK:
			available_accounts = json.data
			return available_accounts
	return []


func select_account(address: String) -> bool:
	if not js_interface:
		return false

	var result = js_interface.selectAccount(address)
	if result:
		current_address = address
		_log("Account selected: " + address)
		wallet_connected.emit(address)
		return true
	return false


func get_current_wallet_info() -> Dictionary:
	if not js_interface:
		return {}

	var info_json = js_interface.getCurrentWalletInfo()
	if info_json:
		var json = JSON.new()
		var parse_result = json.parse(info_json)
		if parse_result == OK:
			return json.data
	return {}


var _callback_account_selection: JavaScriptObject

func request_account_selection() -> void:
	if not js_interface:
		return

	if not _callback_account_selection:
		_callback_account_selection = JavaScriptBridge.create_callback(_on_account_selection_completed)

	_log("Requesting account selection from wallet...")
	js_interface.requestAccountSelection().then(_callback_account_selection)

func _on_account_selection_completed(args: Array):
	if args.is_empty():
		_log("Account selection failed: No result received")
		return

	var accounts_json = args[0]
	_log("Account selection result: " + str(accounts_json))

	if accounts_json:
		var json = JSON.new()
		var parse_result = json.parse(accounts_json)
		if parse_result == OK:
			available_accounts = json.data
			if available_accounts.size() > 0:
				current_address = available_accounts[0]
				_log("Account selection updated. New address: " + current_address)
				wallet_connected.emit(current_address)


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


func fetch_user_nfts():
	if not is_wallet_connected():
		_log("Cannot fetch NFTs - no wallet connected")
		return

	if is_fetching_nfts:
		_log("Already fetching NFTs")
		return

	is_fetching_nfts = true
	user_nfts.clear()

	nfts_queried.connect(_on_user_nfts_fetched, CONNECT_ONE_SHOT)
	nft_query_failed.connect(_on_user_nft_fetch_failed, CONNECT_ONE_SHOT)

	var query_options = {
		"user_address": current_address,
		"rpc_url": config.rpc_url,
		"ipfs_gateway": config.ipfs_gateway,
		"from_token_id": 1,
		"to_token_id": 100,
		"batch_size": 10
	}

	_log("Fetching NFTs for user: " + current_address)
	query_nfts(config.nft_contract, get_erc721_abi(), query_options)


func _on_user_nfts_fetched(result: Dictionary):
	is_fetching_nfts = false

	user_nfts.clear()

	var tokens = result.get("tokens", [])
	_log("Processing " + str(tokens.size()) + " NFTs for user")

	for token_data in tokens:
		if token_data is Dictionary:
			var nft = NFT.new(token_data)
			user_nfts.append(nft)

			# Start async texture loading for each NFT
			if not nft.image.is_empty():
				_load_nft_texture(nft)

	_log("User now has " + str(user_nfts.size()) + " NFTs loaded")
	user_nfts_fetched.emit(user_nfts)


func _on_user_nft_fetch_failed(error: String) -> void:
	_log("Failed to fetch user NFTs: " + error)
	is_fetching_nfts = false



func _load_nft_texture(nft: NFT):
	var http = HTTPRequest.new()
	add_child(http)

	http.request_completed.connect(func(result, response_code, headers, body):
		if response_code == 200:
			var image = Image.new()
			var error = OK

			error = image.load_png_from_buffer(body)
			if error != OK: error = image.load_jpg_from_buffer(body)
			if error != OK: error = image.load_webp_from_buffer(body)
			if error != OK: error = image.load_svg_from_buffer(body, 4.0)
			if error == OK:
				nft.texture = ImageTexture.create_from_image(image)
				_log("Loaded texture for NFT #" + str(nft.token_id) + ": " + nft.get_display_name())
			else:
				_log("Failed to load texture for NFT #" + str(nft.token_id) + ": Invalid image format")
		else:
			_log("Failed to download texture for NFT #" + str(nft.token_id) + ": HTTP " + str(response_code))

		http.queue_free()
	)

	_log("Downloading texture for NFT #" + str(nft.token_id) + " from: " + nft.image)
	http.request(nft.image)


func show_asset_management_screen():
	if asset_management_screen != null:
		return
	
	asset_management_screen = load("res://addons/polkagodot/ui/asset_management_screen/asset_management_screen.tscn").instantiate()
	get_tree().root.add_child(asset_management_screen)
	asset_management_screen.closed.connect(_on_asset_management_screen_closed)
	asset_management_screen.show_screen()
	_log("Showing asset management screen")


func _on_asset_management_screen_closed():
	asset_management_screen = null
	_log("Asset management screen closed")



func equip_nft(nft_token_id: int) -> void:
	if not js_interface:
		_log("Cannot equip NFT - no JavaScript interface available")
		return

	if not is_wallet_connected():
		_log("Cannot equip NFT - wallet not connected")
		return

	_log("Equipping NFT with token ID: " + str(nft_token_id))

	var error_callback = JavaScriptBridge.create_callback(func(args):
		_log("NFT equip transaction failed")
		var error_msg = "Transaction failed"
		if args.size() > 0:
			error_msg = str(args[0])
			_log("Error: " + error_msg)
		nft_equip_failed.emit(error_msg)
	)

	js_interface.equipNFT(nft_token_id, config.game_manager_contract, config.get_chain_config_json()).then(_callback_nft_equipped).catch(error_callback)


func unequip_nft() -> void:
	if not js_interface:
		_log("Cannot unequip NFT - no JavaScript interface available")
		return

	if not is_wallet_connected():
		_log("Cannot unequip NFT - wallet not connected")
		return

	_log("Unequipping NFT")

	var error_callback = JavaScriptBridge.create_callback(func(args):
		_log("NFT unequip transaction failed")
		var error_msg = "Transaction failed"
		if args.size() > 0:
			error_msg = str(args[0])
			_log("Error: " + error_msg)
		nft_unequip_failed.emit(error_msg)
	)

	js_interface.unequipNFT(config.game_manager_contract, config.get_chain_config_json()).then(_callback_nft_unequipped).catch(error_callback)


func query_equipped_nft(player_address: String = "") -> void:
	if not js_interface:
		_log("Cannot query equipped NFT - no JavaScript interface available")
		return

	var address_to_query = player_address if not player_address.is_empty() else current_address

	if address_to_query.is_empty():
		_log("Cannot query equipped NFT - no address provided")
		return

	_log("Querying equipped NFT for address: " + address_to_query)

	var error_callback = JavaScriptBridge.create_callback(func(args):
		_log("NFT equipped query failed")
		if args.size() > 0:
			_log("Error: " + str(args[0]))
	)

	js_interface.queryEquippedNFT(address_to_query, config.game_manager_contract, config.rpc_url).then(_callback_equipped_nft_queried).catch(error_callback)


func _on_nft_equipped(args: Array):
	if args.is_empty():
		_log("NFT equip transaction completed but no result received")
		return

	var result = args[0]
	_log("NFT equip transaction result: " + str(result))

	if not result is String:
		_log("ERROR: Expected String from JavaScript, got " + str(typeof(result)))
		return

	var json = JSON.new()
	var parse_result = json.parse(result)
	if parse_result != OK:
		_log("Failed to parse equip result JSON: " + json.get_error_message())
		return

	var data = json.data

	if data.has("success") and not data.success:
		var error_msg = data.get("error", "Transaction failed")
		_log("NFT equip failed: " + error_msg)
		nft_equip_failed.emit(error_msg)
		return

	if data.has("tokenId"):
		equipped_nft_id = int(data.get("tokenId", 0))
		_log("Successfully equipped NFT #" + str(equipped_nft_id))

		for nft in user_nfts:
			if nft.token_id == equipped_nft_id:
				equipped_nft = nft
				nft_equipped.emit(nft)
				return


func _on_nft_unequipped(args: Array):
	if args.is_empty():
		_log("NFT unequip transaction completed but no result received")
		return

	var result = args[0]
	_log("NFT unequip transaction result: " + str(result))

	if not result is String:
		_log("ERROR: Expected String from JavaScript, got " + str(typeof(result)))
		return

	var json = JSON.new()
	var parse_result = json.parse(result)
	if parse_result != OK:
		_log("Failed to parse unequip result JSON: " + json.get_error_message())
		return

	var data = json.data

	if data.has("success") and not data.success:
		var error_msg = data.get("error", "Transaction failed")
		_log("NFT unequip failed: " + error_msg)
		nft_unequip_failed.emit(error_msg)
		return

	_log("NFT unequip transaction completed successfully")
	equipped_nft_id = 0
	equipped_nft = null
	nft_unequipped.emit()


# Callback when equipped NFT query completes
func _on_equipped_nft_queried(args: Array):
	if args.is_empty():
		_log("Equipped NFT query failed: No result received")
		return

	var result = args[0]
	_log("Equipped NFT query result: " + str(result))

	var token_id = 0

	token_id = int(result)

	equipped_nft_id = token_id
	_log("Player has equipped NFT #" + str(equipped_nft_id))
	equipped_nft_loaded.emit(equipped_nft_id)
	
	for nft in user_nfts:
		if nft.token_id == equipped_nft_id:
			equipped_nft = nft
			nft_equipped.emit(nft)
			return
