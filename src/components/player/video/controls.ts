import GObject from "gi://GObject";
import Adw from "gi://Adw";
import Gtk from "gi://Gtk?version=4.0";

import { MiniVideoPlayer } from "./mini";
import { FullVideoPlayer } from "./full";

MiniVideoPlayer;
FullVideoPlayer;

export class VideoControls extends Adw.Bin {
  static {
    GObject.registerClass({
      GTypeName: "VideoControls",
      Template:
        "resource:///com/vixalien/muzika/ui/components/player/video/controls.ui",
      InternalChildren: [
        "stack",
        "mini",
        "full",
      ],
      Properties: {
        "show-mini": GObject.ParamSpec.boolean(
          "show-mini",
          "Show Mini",
          "Show the minimal video player",
          GObject.ParamFlags.READWRITE,
          true,
        ),
      },
    }, this);
  }

  private _stack!: Gtk.Stack;
  private _mini!: MiniVideoPlayer;
  private _full!: FullVideoPlayer;

  constructor() {
    super();
  }

  get show_mini(): boolean {
    return this._stack.visible_child === this._mini;
  }

  set show_mini(show: boolean) {
    this._stack.visible_child = show ? this._mini : this._full;
  }

  vfunc_unmap(): void {
    this._mini.clear_listeners();
    this._full.clear_listeners();

    super.vfunc_unmap();
  }
}
