## $$\color{pink}WORK \space IN \space PROGRESS! $$

# Overview

PolkaGodot is an extension for Godot Engine 4.5+ that enables plug-and-play EVM wallet connectivity and a complete UX for on-chain equippable cosmetics.

It is designed to work with [Pinkhat](https://github.com/mar1/pinkhat) smart contracts, and is tailored for Polkadot's Asset Hub and its other parachains.

This is made with browser wallet extensions in mind, and therefore will only work with web exports.


## Installation

1. Clone the extension into `res://addons/polkagodot` in your Godot project:

      `git clone https://github.com/pinksters/polkagodot-plugin.git addons/polkagodot`

      (Alternatively, you can click `Code` -> `Download ZIP`, and extract the contents of the archive into `res://addons/polkagodot`)


3. Go to `Project` -> `Project Settings` -> `Plugins`, and enable PolkaGodot


4. If your project doesn't already have a web export template configured, download export templates and add a web export preset


5. In the Web export preset configuration, specify PolkaGodot's Custom HTML Shell in export options:

      in the `Custom HTML Shell` field, specify `res://addons/polkagodot/polkagodot_export_shell.html`



## Configuration

To configure the extension, a `PolkaConfig` resource must be placed at the root of the project (in `res://`).

PolkaConfig resources can be created from the `FileSystem` dock, and can be edited simply by double-clicking the resource to open it in the Inspector panel.

You can find pre-configured templates for Polkadot parachains in `res://addons/polkagodot/config_examples`.
Simply choose the template for your target chain, copy it to the root of your project, and enter the addresses of contracts that you've deployed for your project.


**Alternatively**, you can manually create a PolkaConfig resource at the root of the project:

Right-click on `res://` -> `Create New` -> `Resource`, search for `PolkaConfig`, and create a PolkaConfig resource with any name you want (e.g. `polkagodot_config.tres`).
PolkaGodot will automatically find your PolkaConfig resource at the root of the project, regardless of file name.

Finally, if no PolkaConfig resources are found in `res://`, the extension will instead use the `config.tres` file in its directory. You are free to edit it directly, but it's not recommended due to the risk of overwriting your settings when you update the plugin.


## Usage

The extension is mostly plug-and-play.
After deploying contracts and setting up a config file, just add a wallet connect button and an asset management button anywhere in your project - PolkaGodot will handle the rest.

After a wallet is connected, an array of the user's NFTs can be accessed via `PolkaGodot.user_nfts`.

If the user has a NFT equipped, it will be accessible globally via `PolkaGodot.equipped_nft`.

The NFT class has a very straightforward structure and mirrors all properties of the on-chain token, including custom metadata fields and automatically-loaded texture.



