# Base class for displaying a single NFT asset

extends Control
class_name SingleAssetDisplay

signal asset_clicked(nft: NFT)
var nft: NFT
var is_equipped: bool = false

func set_nft_data(nft_data: NFT):
	nft = nft_data
	_check_equipped_status()
	_update_display()
	nft.data_changed.connect(_update_display)

	# Listen for equipped status changes
	if not PolkaGodot.nft_equipped.is_connected(_on_nft_equipped):
		PolkaGodot.nft_equipped.connect(_on_nft_equipped)
	if not PolkaGodot.nft_unequipped.is_connected(_on_nft_unequipped):
		PolkaGodot.nft_unequipped.connect(_on_nft_unequipped)


func _update_display():
	# Overridden in derived classes to update the visual representation
	pass


func get_display_name() -> String:
	if nft:
		return nft.get_display_name()
	return "Unknown NFT"


func get_token_id() -> int:
	if nft:
		return nft.token_id
	return 0


func get_metadata_field(field_name: String, default_value: String = "") -> String:
	if not nft:
		return default_value

	match field_name:
		"name":
			return nft.name if not nft.name.is_empty() else default_value
		"description":
			return nft.description if not nft.description.is_empty() else default_value
		"image":
			return nft.image if not nft.image.is_empty() else default_value
		_:
			# Check attributes for custom fields
			for attr in nft.attributes:
				if attr is Dictionary and attr.get("trait_type", "") == field_name:
					var value = attr.get("value", "")
					return str(value) if value else default_value
			return default_value


func get_image_url() -> String:
	if nft and not nft.image.is_empty():
		return nft.image
	return ""


func has_metadata_error() -> bool:
	if nft:
		return nft.has_metadata_error
	return false


func get_metadata_error() -> String:
	if nft and nft.has_metadata_error:
		return nft.metadata_error
	return ""


func _check_equipped_status():
	if not nft:
		is_equipped = false
		return

	is_equipped = (nft.token_id == PolkaGodot.equipped_nft_id)


func _on_nft_equipped(equipped_nft: NFT):
	if not nft:
		return

	is_equipped = (nft.token_id == equipped_nft.token_id)
	_update_display()


func _on_nft_unequipped():
	if not nft:
		return

	is_equipped = false
	_update_display()
