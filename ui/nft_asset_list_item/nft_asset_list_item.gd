extends SingleAssetDisplay

@onready var token_id_label: Label = %TokenIdLabel
@onready var name_label: Label = %NameLabel
@onready var select_button: Button = %ClickablePanel
@onready var image_rect: TextureRect = %Image
@onready var equipped_badge: Control = %EquippedBadge


func _ready():
	select_button.pressed.connect(_on_select_button_pressed)


func _update_display():
	if not nft:
		return

	token_id_label.text = "#" + str(nft.token_id)
	name_label.text = nft.get_display_name()
	if nft.texture is Texture2D:
		image_rect.texture = nft.texture

	equipped_badge.visible = is_equipped


func _on_select_button_pressed():
	if not nft:
		return
	asset_clicked.emit(nft)
