extends Button
class_name AccountOptionButton

@export var account_address: String = "" : set = set_account_address
@export var display_name: String = "" : set = set_display_name
@export var is_selected: bool = false : set = set_is_selected

@onready var address_label: Label = $HBoxContainer/AddressLabel
@onready var selected_indicator: Panel = $HBoxContainer/SelectedIndicator


func _ready() -> void:
	toggle_mode = true
	if display_name:
		set_display_name(display_name)
	elif account_address:
		set_display_name(_format_address(account_address))

	set_is_selected(is_selected)


func set_account_address(value: String) -> void:
	account_address = value
	tooltip_text = account_address
	if display_name.is_empty() and address_label:
		address_label.text = _format_address(account_address)


func set_display_name(value: String) -> void:
	display_name = value
	if address_label:
		address_label.text = display_name


func set_is_selected(value: bool) -> void:
	is_selected = value
	if is_selected:
		modulate = Color("ffc1efff")
		self_modulate.a = 1.0
		selected_indicator.modulate.a = 1.0
	else:
		modulate = Color(0.921, 0.921, 0.921, 1.0)
		self_modulate.a = 0.4
		selected_indicator.modulate.a = 0.0


func _format_address(address: String) -> String:
	if address.length() > 12:
		return address.substr(0, 10) + "..." + address.substr(address.length() - 4)
	return address
