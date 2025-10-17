extends RefCounted
class_name NFT

signal data_changed
signal texture_loaded

# Standard ERC-721 properties
var token_id: int = 0
var contract_address: String = ""
var owner: String = ""
var token_uri: String = ""
var image: String = ""
var name: String = ""
var description: String = ""
var attributes: Array = []

# Non-standard properties
var custom_attributes: Dictionary = {}

# Loaded texture
var texture: Texture2D = null:
	set(new_texture):
		texture = new_texture
		texture_loaded.emit()
		data_changed.emit()

# Error tracking
var has_metadata_error: bool = false
var metadata_error: String = ""


func _init(data: Dictionary = {}):
	token_id =            int( data.get("tokenId", 0)           )
	owner =               str( data.get("owner", "")            )
	token_uri =           str( data.get("tokenURI", "")         )
	contract_address =    str( data.get("contractAddress", "")  )

	# Parse metadata if present
	if (data.get("metadata") != null) and (data["metadata"] is Dictionary):
		var metadata = data["metadata"]
	
		name =         str( metadata.get("name", "")         )
		description  = str( metadata.get("description", "")  )
		image =        str( metadata.get("image", "")        )
	
		var attrs = metadata.get("attributes", [])
		attributes = attrs if (attrs is Array) else []
	
		# Store non-standard metadata fields
		var standard_fields: Array[String] = ["tokenId", "owner", "tokenURI", "contractAddress", "chainId", "image", "name", "description", "attributes", "metadata", "metadataError"]
		for metadata_key: String in metadata:
			if metadata_key not in standard_fields:
				custom_attributes[metadata_key] = metadata[metadata_key]
	
	# Track metadata errors
	if data.has("metadataError"):
		has_metadata_error = true
		metadata_error = str(data.get("metadataError", ""))


func get_display_name() -> String:
	if not name.is_empty():
		return name
	return "Token #" + str(token_id)


## Extract attribute value by trait_type
## Returns empty string if trait_type not found
func get_attribute_value(trait_type: String) -> String:
	for attr in attributes:
		if not attr is Dictionary:
			continue
		if attr.get("trait_type", "") == trait_type:
			return str(attr.get("value", ""))

	return ""


## Get attributes as a dictionary {trait_type: value}
## Example: {"Hat Type": "Cowboy hat", "Rarity": "Common"}
func get_attributes_dict() -> Dictionary:
	var result: Dictionary = {}
	
	if attributes is not Array:
		return result
	
	for attr in attributes:
		if attr is not Dictionary:
			continue
		var trait_type_value = attr.get("trait_type", "")
		if not trait_type_value.is_empty():
			result[trait_type_value] = attr.get("value", "")

	return result
