# Base class for displaying multiple NFT assets

extends Control
class_name AssetListDisplay

signal asset_clicked(nft: NFT)

var nft_list: Array[NFT] = []
var item_scene: PackedScene
var item_container: Container

func set_nfts(nfts: Array):
	nft_list.clear()
	for nft in nfts:
		if nft is NFT:
			nft_list.append(nft)
	
	_sort_by_equipped_status()
	_refresh_display()


func add_nft(nft: NFT):
	nft_list.append(nft)
	_add_item_to_display(nft)


func remove_nft(nft: NFT):
	var index = nft_list.find(nft)
	if index >= 0:
		nft_list.remove_at(index)
		_remove_item_from_display(index)


func clear():
	nft_list.clear()
	_clear_display()


func sort_by_field(field_name: String, ascending: bool = true):
	match field_name:
		"token_id":
			nft_list.sort_custom(func(a, b): return a.token_id < b.token_id if ascending else a.token_id > b.token_id)
		"name":
			nft_list.sort_custom(func(a, b): return a.name < b.name if ascending else a.name > b.name)
		_:
			pass
	_refresh_display()


func filter_by_condition(condition: Callable) -> Array[NFT]:
	var filtered: Array[NFT] = []
	for nft in nft_list:
		if condition.call(nft):
			filtered.append(nft)
	return filtered


func _refresh_display():
	_clear_display()
	for nft in nft_list:
		_add_item_to_display(nft)


func _add_item_to_display(nft: NFT):
	# Overridden in derived classes to add an item to the display
	pass


func _remove_item_from_display(index: int):
	if item_container and index < item_container.get_child_count():
		var child = item_container.get_child(index)
		if child:
			child.queue_free()


func _clear_display():
	if item_container:
		for child in item_container.get_children():
			child.queue_free()


func _on_item_clicked(index: int):
	if index >= 0 and index < nft_list.size():
		asset_clicked.emit(nft_list[index])


func get_nft_count() -> int:
	return nft_list.size()


func _sort_by_equipped_status() -> void:
	if nft_list.is_empty() or PolkaGodot.equipped_nft_id == 0:
		return
	
	nft_list.sort_custom(func(a: NFT, b: NFT):
		return (a.token_id == PolkaGodot.equipped_nft_id)
	)
