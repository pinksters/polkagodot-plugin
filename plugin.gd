@tool
extends EditorPlugin

const AUTOLOAD_NAME = "PolkaGodot"
const AUTOLOAD_PATH = "res://addons/polkagodot/autoload/polkagodot.gd"

func _enter_tree():
	add_autoload_singleton(AUTOLOAD_NAME, AUTOLOAD_PATH)
	print("PolkaGodot plugin enabled")

func _exit_tree():
	remove_autoload_singleton(AUTOLOAD_NAME)
	print("PolkaGodot plugin disabled")
