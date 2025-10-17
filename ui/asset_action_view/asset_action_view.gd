extends CanvasLayer

signal closed()

@onready var card_view = $"3DCardView"
@onready var status_label: Label = %StatusLabel
@onready var action_button: Button = %ActionButton
@onready var close_button: Button = %CloseButton
@onready var loading_overlay: ColorRect = %LoadingOverlay
@onready var loading_label: Label = %LoadingLabel
@onready var loading_close_button: Button = %LoadingCloseButton
@onready var background: ColorRect = $Background

var current_nft: NFT = null
var is_processing: bool = false


func _ready():
	# Connect button signals
	action_button.pressed.connect(_on_action_button_pressed)
	close_button.pressed.connect(_on_close_button_pressed)
	loading_close_button.pressed.connect(_on_close_button_pressed)

	# Connect to PolkaGodot signals
	PolkaGodot.nft_equipped.connect(_on_nft_equipped)
	PolkaGodot.nft_equip_failed.connect(_on_nft_equip_failed)
	PolkaGodot.nft_unequipped.connect(_on_nft_unequipped)
	PolkaGodot.nft_unequip_failed.connect(_on_nft_unequip_failed)
	PolkaGodot.equipped_nft_loaded.connect(_on_equipped_nft_loaded)

	# Initially hide
	hide()


func show_nft(nft: NFT):
	if not nft:
		return
	
	current_nft = nft
	card_view.card.get_card_content().set_nft_data(nft)
	_update_equipped_status()
	show()


func _update_equipped_status():
	if not current_nft:
		return
	
	var is_equipped = PolkaGodot.equipped_nft_id == current_nft.token_id
	
	if is_equipped:
		status_label.text = "Equipped"
		action_button.text = "Unequip"
	else:
		status_label.text = "Not Equipped"
		action_button.text = "Equip"


func _on_action_button_pressed():
	if is_processing or not current_nft:
		return
	
	if PolkaGodot.equipped_nft_id == current_nft.token_id:
		_unequip_nft()
	else:
		_equip_nft()


func _equip_nft():
	is_processing = true
	_show_loading_state("Equipping...")
	PolkaGodot.equip_nft(current_nft.token_id)


func _unequip_nft():
	is_processing = true
	_show_loading_state("Unequipping...")
	PolkaGodot.unequip_nft()


func _show_loading_state(message: String):
	loading_label.text = message
	loading_overlay.visible = true


func _hide_loading_state():
	loading_overlay.visible = false
	is_processing = false


func _on_nft_equipped(nft: NFT):
	if current_nft and nft.token_id == current_nft.token_id:
		_hide_loading_state()
		_update_equipped_status()


func _on_nft_unequipped():
	_hide_loading_state()
	_update_equipped_status()


func _on_equipped_nft_loaded(nft_id: int):
	if current_nft:
		_update_equipped_status()


func _on_nft_equip_failed(_error: String):
	_hide_loading_state()


func _on_nft_unequip_failed(error: String):
	_hide_loading_state()


func _on_close_button_pressed():
	hide()
	closed.emit()


func _input(event: InputEvent):
	if visible and event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		_on_close_button_pressed()
		get_viewport().set_input_as_handled()
