extends Object
class_name WalletIcons

static var _icon_mappings: Dictionary = {
	"metamask": "metamask.svg",
	"coinbase": "coinbase.svg",
	"coinbase wallet": "coinbase.svg",
	"wallet connect": "wallet-connect.svg",
	"walletconnect": "wallet-connect.svg",
	"trust": "trust.svg",
	"trust wallet": "trust.svg",
	"argent": "argent.svg",
	"rainbow": "rainbow.svg",
	"enkrypt": "enkrypt.svg",
	"phantom": "phantom.svg",
	"okx": "okx.svg",
	"okx wallet": "okx.svg",
	"rabby": "rabby.svg",
	"rabby wallet": "rabby.svg",
	"zerion": "zerion.svg",
	"xdefi": "xdefi.svg",
	"xdefi wallet": "xdefi.svg",
	"zengo": "zengo.svg",
	"wallet3": "wallet-3.svg",
	"wallet 3": "wallet-3.svg",
	"venly": "venly.svg",
	"unipass": "unipass.svg",
	"trezor": "trezor.svg",
	"tokenpocket": "token-pocket.svg",
	"token pocket": "token-pocket.svg",
	"safe": "safe.svg",
	"gnosis safe": "safe.svg",
	"ronin": "ronin.svg",
	"ronin wallet": "ronin.svg",
	"sequence": "sequence.svg",
	"portal": "portal.svg",
	"pillar": "pillar.svg",
	"obvious": "obvious.svg",
	"myetherwallet": "my-ether-wallet.svg",
	"mew": "my-ether-wallet.svg",
	"multis": "multis.svg",
	"lit": "lit.svg",
	"ledger": "ledger.svg",
	"kraken": "kraken.svg",
	"imtoken": "imtoken.svg",
	"clave": "clave.svg",
	"coin98": "coin98.svg",
	"backpack": "backpack.svg",
	"alpha wallet": "alpha-wallet.svg",
	"alphawallet": "alpha-wallet.svg",
	"alfa1": "alfa1.svg",
	"talisman": "talisman.png"
}


static func get_icon(wallet_name: String) -> Texture:
	if wallet_name.is_empty():
		return null
	
	var normalized_wallet_name: String = wallet_name.to_lower().strip_edges()
	
	# Exact match
	if normalized_wallet_name in _icon_mappings.keys():
		return load_icon(normalized_wallet_name)
	
	# Partial match
	for icon_mapping_key: String in _icon_mappings.keys():
		if icon_mapping_key.contains(normalized_wallet_name):
			return load_icon(icon_mapping_key)
	
	return null


static func load_icon(icon_mapping_key: String) -> Texture:
	var icon_file_name = _icon_mappings[icon_mapping_key]
	var icon_path = "res://addons/polkagodot/assets/wallet-icons/%s" % icon_file_name
	
	if ResourceLoader.exists(icon_path):
		var icon = load(icon_path) as Texture
		if icon:
			return icon
	
	return null
