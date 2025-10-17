extends CanvasLayer

@onready var panel_container: PanelContainer = %PanelContainer
@onready var title_label: Label = %TitleLabel
@onready var close_button: Button = %CloseButton
@onready var refresh_button: Button = %RefreshButton

# Tab navigation
@onready var tab_container: HBoxContainer = %TabContainer
@onready var list_view_button: Button = %ListViewButton
@onready var grid_view_button: Button = %GridViewButton

# Content container
@onready var content_container: Control = %ContentContainer
@onready var list_view_content: Control = %ListViewContent
@onready var grid_view_content: Control = %GridViewContent

# Asset list views
@onready var list_view: AssetListDisplay = %ListViewContent/UserAssetsListView
@onready var grid_view: AssetListDisplay = %GridViewContent/UserAssetsGridView

# Asset action view
@onready var asset_action_view: CanvasLayer = %AssetActionView

var current_view_mode: String = "list"
var is_refreshing: bool = false

signal closed

func _ready():
	# Connect button signals
	close_button.pressed.connect(_on_close_button_pressed)
	refresh_button.pressed.connect(_on_refresh_button_pressed)
	list_view_button.pressed.connect(_on_list_view_button_pressed)
	grid_view_button.pressed.connect(_on_grid_view_button_pressed)

	# Connect PolkaGodot signals
	PolkaGodot.wallet_connected.connect(_on_wallet_connected)
	PolkaGodot.wallet_disconnected.connect(_on_wallet_disconnected)
	PolkaGodot.user_nfts_fetched.connect(_on_nfts_fetched)

	# Connect UI signals
	if list_view: list_view.asset_clicked.connect(_on_asset_clicked)
	grid_view.asset_clicked.connect(_on_asset_clicked)
	asset_action_view.closed.connect(_on_asset_action_view_closed)

	# Initial setup
	_update_ui_state()
	_set_view_mode("list")


func _update_ui_state() -> void:
	_update_nft_count()
	_update_refresh_button()
	_update_tab_buttons()


func _format_address(address: String) -> String:
	if address.length() > 10:
		return address.substr(0, 6) + "..." + address.substr(address.length() - 4)
	return address


func _set_view_mode(view_mode: String):
	current_view_mode = view_mode
	
	var view_mode_screens: Dictionary = {
		list_view_content: "list",
		grid_view_content: "grid"
	}
	
	for child in content_container.get_children():
		child.visible = (view_mode_screens[child] == view_mode)
	
	_update_tab_buttons()


func _update_nft_count() -> void:
	var nft_count: int = PolkaGodot.user_nfts.size()
	title_label.text = "My Assets (%d)" % nft_count


func _update_refresh_button() -> void:
	refresh_button.disabled = not is_connected or is_refreshing
	refresh_button.modulate = Color(0.6, 0.6, 0.6) if is_refreshing else Color.WHITE


func _update_tab_buttons():
	list_view_button.disabled = (current_view_mode == "list")
	grid_view_button.disabled = (current_view_mode == "grid")


func _on_close_button_pressed():
	close()


func _on_refresh_button_pressed():
	if is_refreshing or not PolkaGodot.is_wallet_connected():
		return
	
	is_refreshing = true
	_update_ui_state()
	PolkaGodot.fetch_user_nfts()
	
	await get_tree().create_timer(2.0).timeout
	is_refreshing = false
	_update_ui_state()


func _on_list_view_button_pressed():
	_set_view_mode("list")


func _on_grid_view_button_pressed():
	_set_view_mode("grid")


func _on_wallet_connected(_address: String):
	_update_ui_state()


func _on_wallet_disconnected():
	_update_ui_state()


func _on_nfts_fetched(_nfts: Array):
	is_refreshing = false
	_update_ui_state()


func show_screen():
	show()
	_update_ui_state()
	
	if PolkaGodot.is_wallet_connected() and PolkaGodot.user_nfts.size() == 0:
		_on_refresh_button_pressed()


func close():
	closed.emit()
	queue_free()


func _on_asset_clicked(nft: NFT):
	if asset_action_view and asset_action_view.has_method("show_nft"):
		asset_action_view.show_nft(nft)


func _on_asset_action_view_closed():
	pass
