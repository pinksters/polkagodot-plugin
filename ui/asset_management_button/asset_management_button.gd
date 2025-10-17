extends Button

enum ButtonState {
	NOT_CONNECTED,
	LOADING_ASSETS,
	ASSETS_LOADED,
	NO_ASSETS
}

signal asset_management_requested

@onready var label: Label = $Label
@onready var badge_container: Control = $BadgeContainer
@onready var badge_label: Label = $BadgeContainer/BadgeLabel

var update_timer: Timer = null
var current_state: ButtonState = ButtonState.NOT_CONNECTED
var nft_count: int = 0


func _ready():
	# Connect to PolkaGodot signals
	PolkaGodot.wallet_connected.connect(_on_wallet_connected)
	PolkaGodot.wallet_disconnected.connect(_on_wallet_disconnected)
	PolkaGodot.user_nfts_fetched.connect(_on_nfts_fetched)
	PolkaGodot.nft_query_failed.connect(_on_nft_query_failed)

	pressed.connect(_on_button_pressed)

	# Create update timer
	update_timer = Timer.new()
	add_child(update_timer)
	update_timer.timeout.connect(_update_button_state)
	update_timer.wait_time = 0.5
	update_timer.start()

	_update_button_state()


func _update_button_state():
	var new_state: ButtonState

	if not PolkaGodot.is_connected:
		new_state = ButtonState.NOT_CONNECTED
		nft_count = 0
	elif PolkaGodot.is_fetching_nfts:
		new_state = ButtonState.LOADING_ASSETS
	elif PolkaGodot.user_nfts.size() > 0:
		new_state = ButtonState.ASSETS_LOADED
		nft_count = PolkaGodot.user_nfts.size()
	else:
		new_state = ButtonState.NO_ASSETS
		nft_count = 0

	if new_state != current_state:
		current_state = new_state
		_apply_button_style()


func _apply_button_style():
	match current_state:
		ButtonState.NOT_CONNECTED:
			label.text = "View Assets"
			disabled = true
			self_modulate = Color.GRAY
			tooltip_text = "Connect wallet to view your assets"
			_update_badge(0)

		ButtonState.LOADING_ASSETS:
			label.text = "Loading..."
			disabled = true
			self_modulate = Color(0.8, 0.8, 0.8)
			tooltip_text = "Loading your NFTs..."
			_update_badge(0)

		ButtonState.ASSETS_LOADED:
			label.text = "My Assets"
			disabled = false
			self_modulate = Color("#FF69B4")
			tooltip_text = "You have " + str(nft_count) + " NFT" + ("s" if nft_count != 1 else "")
			_update_badge(nft_count)

		ButtonState.NO_ASSETS:
			label.text = "My Assets"
			disabled = false
			self_modulate = Color(0.584, 0.735, 1.0, 1.0)
			tooltip_text = "No NFTs found"
			_update_badge(0)


func _update_badge(count: int):
	if not badge_container or not badge_label:
		return

	if count > 0:
		badge_label.text = str(count)
		badge_container.visible = true

		# Animate badge appearance
		var tween = get_tree().create_tween()
		badge_container.scale = Vector2(0.5, 0.5)
		tween.tween_property(badge_container, "scale", Vector2(1.0, 1.0), 0.2).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	else:
		badge_container.visible = false


func _on_button_pressed():
	if current_state != ButtonState.NOT_CONNECTED and current_state != ButtonState.LOADING_ASSETS:
		PolkaGodot.show_asset_management_screen()
		asset_management_requested.emit()


func _on_wallet_connected(_address: String):
	_update_button_state()


func _on_wallet_disconnected():
	_update_button_state()


func _on_nfts_fetched(_nfts: Array):
	_update_button_state()


func _on_nft_query_failed(_error: String):
	_update_button_state()


func _exit_tree():
	if update_timer:
		update_timer.stop()
		update_timer.queue_free()
