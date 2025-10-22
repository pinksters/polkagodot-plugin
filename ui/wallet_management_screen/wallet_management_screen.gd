extends CanvasLayer

@onready var panel_container: PanelContainer = %PanelContainer
@onready var title_label: Label = %TitleLabel
@onready var wallet_label: Label = %WalletLabel
@onready var wallet_list_container: VBoxContainer = %WalletListContainer
@onready var account_list_container: VBoxContainer = %AccountListContainer
@onready var connect_button: Button = %ConnectButton
@onready var connect_button_label: Label = %ConnectButton/Label
@onready var disconnect_button: Button = %DisconnectButton
@onready var close_button: Button = %CloseButton
@onready var refresh_button: Button = %RefreshButton

@onready var extension_selection_nodes: Array[Node] = [
	%ExtensionScrollContainer,
	%RefreshButton
]

@onready var account_selection_nodes: Array[Node] = [
	%AccountScrollContainer
]

var current_wallet_address: String = ""
var current_wallet_id: String = ""
var is_connecting: bool = false
var discovered_wallets: Array = []
var available_accounts: Array = []
var selected_wallet_id: String = ""
var selected_account: String = ""

signal closed


func _show_extension_selection_screen():
	for node in extension_selection_nodes:
		node.visible = true
	for node in account_selection_nodes:
		node.visible = false


func _show_account_selection_screen():
	for node in extension_selection_nodes:
		node.visible = false
	for node in account_selection_nodes:
		node.visible = true


func _hide_all_screens():
	for node in extension_selection_nodes:
		node.visible = false
	for node in account_selection_nodes:
		node.visible = false


func _ready():
	PolkaGodot.wallet_connected.connect(_on_wallet_connected)
	PolkaGodot.wallet_disconnected.connect(_on_wallet_disconnected)
	PolkaGodot.wallet_connection_failed.connect(_on_wallet_connection_failed)

	connect_button.pressed.connect(_on_connect_button_pressed)
	disconnect_button.pressed.connect(_on_disconnect_button_pressed)
	close_button.pressed.connect(_on_close_button_pressed)
	refresh_button.pressed.connect(_refresh_wallets)

	_refresh_wallets()
	_update_ui_state()


func _refresh_wallets():
	discovered_wallets = PolkaGodot.get_discovered_wallets()
	_update_wallet_list()
	_update_ui_state()


func _update_ui_state():
	if not PolkaGodot:
		return

	var is_connected = PolkaGodot.is_wallet_connected()
	var has_provider = PolkaGodot.has_ethereum_provider()

	if is_connecting:
		connect_button.disabled = true
		connect_button_label.modulate.a = 0.3
		disconnect_button.visible = false
		refresh_button.disabled = true
		_show_extension_selection_screen()
	elif is_connected:
		current_wallet_address = PolkaGodot.get_wallet_address()
		current_wallet_id = PolkaGodot.current_wallet_id
		var wallet_info = PolkaGodot.get_current_wallet_info()
		var wallet_name = wallet_info.get("name", "Unknown Wallet") if wallet_info else "Unknown Wallet"

		connect_button.visible = false
		disconnect_button.visible = true
		disconnect_button.disabled = false
		refresh_button.disabled = false

		wallet_label.text = "Connected: " + wallet_name # TODO: A prettier way to communicate that the wallet is connected
		_show_account_selection_screen()

		_update_account_list()
	elif discovered_wallets.size() > 0 or has_provider:
		connect_button.visible = true
		connect_button.disabled = selected_wallet_id.is_empty()
		connect_button_label.text = "Connect"
		connect_button.self_modulate = Color(0.2, 0.4, 1.0)
		disconnect_button.visible = false
		refresh_button.disabled = false

		wallet_label.text = "Available Wallets:"
		_show_extension_selection_screen()
	else: # No wallets available
		connect_button.visible = true
		connect_button.disabled = true
		connect_button_label.modulate.a = 0.3
		connect_button_label.text = "No Wallets"
		connect_button.self_modulate = Color.GRAY
		disconnect_button.visible = false
		refresh_button.disabled = false

		wallet_label.text = "No Wallets Detected"
		_hide_all_screens()


func _update_wallet_list():
	const wallet_option_button: PackedScene = preload("res://addons/polkagodot/ui/wallet_management_screen/wallet_option_button/wallet_option_button.tscn")

	for child in wallet_list_container.get_children():
		child.queue_free()

	if discovered_wallets.is_empty() and not PolkaGodot.is_wallet_connected():
		await get_tree().create_timer(1.0).timeout
		_refresh_wallets()
	else:
		for wallet in discovered_wallets:
			var wallet_button = wallet_option_button.instantiate()
			var wallet_name: String = wallet.get("name", "Unknown Wallet")
			wallet_button.wallet_name = wallet_name
			wallet_button.wallet_icon = WalletIcons.get_icon(wallet_name)
			wallet_button.set_meta("wallet_id", wallet.get("id", ""))

			if PolkaGodot.is_wallet_connected() and PolkaGodot.current_wallet_id == wallet.get("id", ""):
				wallet_button.button_pressed = true
				wallet_button.disabled = true
			elif selected_wallet_id == wallet.get("id", ""):
				wallet_button.button_pressed = true

			wallet_button.pressed.connect(_on_wallet_selected.bind(wallet_button))
			wallet_list_container.add_child(wallet_button)


func _update_account_list():
	const account_option_button: PackedScene = preload("res://addons/polkagodot/ui/wallet_management_screen/account_option_button/account_option_button.tscn")

	for child in account_list_container.get_children():
		child.queue_free()

	available_accounts = PolkaGodot.get_available_accounts()

	if available_accounts.is_empty():
		pass # TODO: Communicate to the user that no accounts are available
	else:
		for account in available_accounts:
			var account_button = account_option_button.instantiate()
			account_button.account_address = account
			account_button.set_meta("address", account)

			if account == PolkaGodot.current_address:
				account_button.button_pressed = true
				account_button.is_selected = true
			elif account == selected_account:
				account_button.button_pressed = true

			account_button.pressed.connect(_on_account_selected.bind(account_button))
			account_list_container.add_child(account_button)


func _on_wallet_selected(wallet_button: Button):
	for child in wallet_list_container.get_children():
		if child is Button and child != wallet_button:
			child.button_pressed = false
			child.modulate = Color.WHITE

	if wallet_button.button_pressed:
		selected_wallet_id = wallet_button.get_meta("wallet_id")
		connect_button.disabled = false
		connect_button_label.modulate.a = 1.0

		if not PolkaGodot.is_wallet_connected():
			for child in account_list_container.get_children():
				child.queue_free()
	else:
		selected_wallet_id = ""
		connect_button.disabled = true
		connect_button_label.modulate.a = 0.3


func _on_account_selected(account_button: AccountOptionButton):
	if not PolkaGodot.is_wallet_connected():
		return

	for child in account_list_container.get_children():
		if child is AccountOptionButton and child != account_button:
			child.button_pressed = false
			child.is_selected = false

	if account_button.button_pressed:
		selected_account = account_button.get_meta("address")

		if selected_account != PolkaGodot.current_address:
			PolkaGodot.select_account(selected_account)
	else:
		selected_account = ""


func _format_address(address: String) -> String:
	if address.length() > 10:
		return address.substr(0, 6) + "..." + address.substr(address.length() - 4)
	return address


func _on_connect_button_pressed():
	if is_connecting or selected_wallet_id.is_empty():
		return

	is_connecting = true
	_update_ui_state()
	PolkaGodot.connect_wallet(selected_wallet_id)


func _on_disconnect_button_pressed():
	PolkaGodot.disconnect_wallet()
	selected_wallet_id = ""
	selected_account = ""
	_refresh_wallets()


func _on_close_button_pressed():
	close()


func _on_wallet_connected(address: String):
	is_connecting = false
	current_wallet_address = address
	current_wallet_id = PolkaGodot.current_wallet_id
	selected_wallet_id = current_wallet_id
	selected_account = address
	#_update_wallet_list()
	#_update_ui_state()
	close()


func _on_wallet_disconnected():
	is_connecting = false
	current_wallet_address = ""
	current_wallet_id = ""
	selected_wallet_id = ""
	selected_account = ""
	_refresh_wallets()


func _on_wallet_connection_failed(error: String):
	is_connecting = false
	_update_ui_state()

	await get_tree().create_timer(3.0).timeout
	_update_ui_state()


func show_screen():
	show()
	_refresh_wallets()


func close():
	closed.emit()
	queue_free()


func _on_account_selection_update(_address: String):
	_update_account_list()
	_update_ui_state()
