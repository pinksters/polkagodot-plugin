extends SingleAssetDisplay

@onready var token_id_label: Label = %TokenIdLabel
@onready var name_label: Label = %NameLabel
@onready var image_rect: TextureRect = %Image
@onready var bg_2: TextureRect = $ImageBackground2
@onready var bg_logo: TextureRect = $BackgroundLogo
@onready var logo_on_card: TextureRect = $CardLogo
@onready var equipped_badge: Control = %EquippedBadge

@onready var image_origin: Vector2 = image_rect.position
@onready var bg_2_origin: Vector2 = bg_2.position
@onready var bg_logo_origin: Vector2 = bg_logo.position


func _update_display():
	if not nft:
		return

	token_id_label.text = "#" + str(nft.token_id)
	name_label.text = nft.get_display_name()
	if nft.texture is Texture2D:
		image_rect.texture = nft.texture

	equipped_badge.visible = is_equipped


func _process(delta: float) -> void:
	bg_logo.rotation += delta * 0.4
	logo_on_card.rotation -= delta * 0.8


func update_parallax(x_offset: float, y_offset: float) -> void:
	const BG_2_PARALLAX_SCALE = 0.12
	const BG_LOGO_PARALLAX_SCALE = 0.25
	const IMG_PARALLAX_SCALE = 0.4
	const GLOBAL_PARALLAX_SCALE = 1.0
	
	bg_2.position = bg_2_origin - Vector2(x_offset, y_offset) * GLOBAL_PARALLAX_SCALE * BG_2_PARALLAX_SCALE
	bg_logo.position = bg_logo_origin - Vector2(x_offset, y_offset) * GLOBAL_PARALLAX_SCALE * BG_LOGO_PARALLAX_SCALE
	image_rect.position = image_origin - Vector2(x_offset, y_offset) * GLOBAL_PARALLAX_SCALE * IMG_PARALLAX_SCALE
