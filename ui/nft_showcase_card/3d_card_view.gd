extends Control

@onready var center_marker: Control = $Center
@onready var card: Node3D = $SubViewportContainer/SubViewport/NFTShowcaseCard
@onready var mesh: MeshInstance3D = card.get_card_mesh()
@onready var card_content: Control = card.get_card_content()


func _process(delta: float) -> void:
	_align_card_with_mouse_offset()


func _align_card_with_mouse_offset() -> void:
	const offset_scale: float = 0.002
	
	var mouse_offset: Vector2 = center_marker.get_local_mouse_position()
	mesh.rotation.x = mouse_offset.y * offset_scale
	mesh.rotation.y = mouse_offset.x * offset_scale
	card_content.update_parallax(mouse_offset.x, mouse_offset.y)
