extends Control

@onready var center_marker: Control = $Center
@onready var card: Node3D = $SubViewportContainer/SubViewport/NFTShowcaseCard
@onready var mesh: MeshInstance3D = card.get_card_mesh()
@onready var card_content: Control = card.get_card_content()

var mouse_offset_target = Vector2(0, 0)
var card_rotation_target = Vector2(0, 0)



func _process(delta: float) -> void:
	_lerp_card_rotation(delta)


func _align_card_with_mouse_offset() -> void:
	const offset_scale: float = 0.002
	
	var mouse_offset: Vector2 = center_marker.get_local_mouse_position()
	mesh.rotation.x = mouse_offset.y * offset_scale
	mesh.rotation.y = mouse_offset.x * offset_scale
	card_content.update_parallax(mouse_offset.x, mouse_offset.y)


func _lerp_card_rotation(delta: float) -> void:
	const OFFSET_SCALE: float = 0.002
	const LERP_SPEED: float = 10.0
	
	var max_mouse_offset: float = 370.0
	var offset_bounds_origin: Vector2 = Vector2(0, -230)
	var mouse_offset: Vector2 = center_marker.get_local_mouse_position()
	if (mouse_offset - offset_bounds_origin).length() > max_mouse_offset: mouse_offset = Vector2.ZERO
	
	mouse_offset_target = lerp(mouse_offset_target, mouse_offset, delta * LERP_SPEED)
	mesh.rotation.x = mouse_offset_target.y * OFFSET_SCALE
	mesh.rotation.y = mouse_offset_target.x * OFFSET_SCALE
	card_content.update_parallax(mouse_offset_target.x, mouse_offset_target.y)
