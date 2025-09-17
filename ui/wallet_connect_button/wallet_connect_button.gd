extends Button

enum ButtonState {
	NO_WALLETS,
	CONNECT_WALLET,
	CONNECTED
}

signal wallet_management_requested

@onready var label: Label = $Label
var update_timer: Timer = null
var current_state: ButtonState = ButtonState.NO_WALLETS
var current_address: String = ""


func _ready():
	PolkaGodot.wallet_connected.connect(_on_wallet_connected)
	PolkaGodot.wallet_disconnected.connect(_on_wallet_disconnected)
	PolkaGodot.wallet_connection_failed.connect(_on_wallet_connection_failed)

	pressed.connect(_on_button_pressed)

	update_timer = Timer.new()
	add_child(update_timer)
	update_timer.timeout.connect(_update_button_state)
	update_timer.wait_time = 0.5
	update_timer.start()

	custom_minimum_size = Vector2(200, 40)
	theme_type_variation = "WalletConnectButton"

	_update_button_state()


func _update_button_state():
	var new_state: ButtonState
	
	if PolkaGodot.is_connected:
		new_state = ButtonState.CONNECTED
		current_address = PolkaGodot.get_wallet_address()
	elif PolkaGodot.has_ethereum_provider():
		new_state = ButtonState.CONNECT_WALLET
	else:
		new_state = ButtonState.NO_WALLETS
		label.text = "No wallet detected"
		disabled = true

	
	if new_state != current_state:
		current_state = new_state
		_apply_button_style()


func _apply_button_style():
	match current_state:
		ButtonState.NO_WALLETS:
			label.text = "No wallets detected"
			disabled = true
			self_modulate = Color.GRAY
			tooltip_text = "Please install a Web3 wallet extension"

		ButtonState.CONNECT_WALLET:
			label.text = "Connect Wallet"
			disabled = false
			self_modulate = Color(0.584, 0.735, 1.0, 1.0)
			tooltip_text = "Click to connect your wallet"

		ButtonState.CONNECTED:
			label.text = _format_address(current_address)
			disabled = false
			self_modulate = Color("#FF69B4")
			tooltip_text = "Wallet connected: " + current_address


func _format_address(address: String) -> String:
	if address.length() > 10:
		return address.substr(0, 8) + "..." + address.substr(address.length() - 4)
	return address


func _on_button_pressed():
	if current_state == ButtonState.CONNECT_WALLET or current_state == ButtonState.CONNECTED:
		PolkaGodot.show_wallet_management_screen()


func _on_wallet_connected(address: String):
	current_address = address
	_update_button_state()


func _on_wallet_disconnected():
	current_address = ""
	_update_button_state()


func _on_wallet_connection_failed(error: String):
	_update_button_state()


func _exit_tree():
	if update_timer:
		update_timer.stop()
		update_timer.queue_free()
