extends Button
class_name WalletOptionButton

@export var wallet_name: String = "" : set = set_wallet_name
@export var wallet_icon: Texture = null : set = set_wallet_icon

@onready var icon_rect: TextureRect = $HBoxContainer/IconRect
@onready var name_label: Label = $HBoxContainer/NameLabel


func _ready() -> void:
	toggle_mode = true
	if wallet_name:
		set_wallet_name(wallet_name)
	if wallet_icon:
		set_wallet_icon(wallet_icon)


func set_wallet_name(value: String) -> void:
	wallet_name = value
	if name_label:
		name_label.text = wallet_name


func set_wallet_icon(value: Texture) -> void:
	wallet_icon = value
	if icon_rect:
		icon_rect.texture = wallet_icon
		icon_rect.visible = wallet_icon != null
