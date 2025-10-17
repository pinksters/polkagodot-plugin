extends AssetListDisplay

@onready var scroll_container: ScrollContainer = $ScrollContainer
@onready var list_container: VBoxContainer = $ScrollContainer/ListContainer
@onready var empty_state_label: Label = $EmptyStateLabel
@onready var loading_indicator: Control = $LoadingIndicator

var is_loading: bool = false


func _ready():
	item_container = list_container
	item_scene = preload("res://addons/polkagodot/ui/nft_asset_list_item/nft_asset_list_item.tscn")
	
	PolkaGodot.user_nfts_fetched.connect(_on_nfts_fetched)
	PolkaGodot.nft_query_failed.connect(_on_nft_query_failed)
	
	_update_empty_state()
	if PolkaGodot.is_wallet_connected():
		refresh_nfts()


func refresh_nfts():
	if is_loading:
		return
	
	is_loading = true
	_show_loading_state()
	
	if PolkaGodot.user_nfts.size() > 0:
		set_nfts(PolkaGodot.user_nfts)
		is_loading = false
		_hide_loading_state()
	else:
		PolkaGodot.fetch_user_nfts()


func _add_item_to_display(nft: NFT):
	if not item_container or not item_scene:
		return
	
	var item_instance = item_scene.instantiate()
	item_container.add_child(item_instance)
	item_instance.set_nft_data(nft)
	
	var item_index = item_container.get_child_count() - 1
	item_instance.asset_clicked.connect(_on_item_asset_clicked)


func _on_item_asset_clicked(nft: NFT):
	asset_clicked.emit(nft)


func _on_nfts_fetched(nfts: Array):
	is_loading = false
	_hide_loading_state()
	set_nfts(nfts)
	_update_empty_state()


func _on_nft_query_failed(error: String):
	is_loading = false
	_hide_loading_state()
	_show_error_state(error)


func _show_loading_state():
	if loading_indicator:
		loading_indicator.visible = true
	if empty_state_label:
		empty_state_label.visible = false
	if scroll_container:
		scroll_container.visible = false


func _hide_loading_state():
	if loading_indicator:
		loading_indicator.visible = false
	if scroll_container:
		scroll_container.visible = true


func _update_empty_state():
	var has_nfts = get_nft_count() > 0

	if empty_state_label:
		if has_nfts:
			empty_state_label.visible = false
		else:
			if PolkaGodot.is_wallet_connected():
				empty_state_label.text = "No NFTs found for this wallet"
			else:
				empty_state_label.text = "Connect a wallet to view your NFTs"
			empty_state_label.visible = true

	if scroll_container:
		scroll_container.visible = has_nfts


func _show_error_state(error: String):
	if empty_state_label:
		empty_state_label.text = "Failed to load NFTs: " + error
		empty_state_label.visible = true
	if scroll_container:
		scroll_container.visible = false


func _clear_display():
	super._clear_display()
	_update_empty_state()
