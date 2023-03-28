import Soup from "gi://Soup?version=3.0";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import GObject from "gi://GObject";
import GdkPixbuf from "gi://GdkPixbuf";
import Gtk from "gi://Gtk?version=4.0";

/*
const IMAGE_URL = "https://cataas.com/cat";

Gio._promisify(Soup.Session.prototype, "send_async", "send_finish");
Gio._promisify(
  GdkPixbuf.Pixbuf,
  "new_from_stream_async",
  "new_from_stream_finish",
);

const input_stream = await getInputStream(IMAGE_URL);
const pixbuf = await GdkPixbuf.Pixbuf.new_from_stream_async(input_stream, null);
workbench.builder.get_object("picture").set_pixbuf(pixbuf);

async function getInputStream(url) {
  const session = new Soup.Session();
  const message = new Soup.Message({
    method: "GET",
    uri: GLib.Uri.parse(url, GLib.UriFlags.NONE),
  });
  const input_stream = await session.send_async(message, null, null);
  const { status_code, reason_phrase } = message;
  if (status_code !== 200) {
    throw new Error(`Got ${status_code}, ${reason_phrase}`);
  }
  return input_stream;
}

*/

import { fetch } from "../polyfills/fetch.js";

export class WebImage extends Gtk.Image {
  static {
    GObject.registerClass({
      GTypeName: "WebImage",
    }, this);
  }

  load(url: string) {
    fetch(url, {
      method: "GET",
    }).then(async (response) => {
      const pixbuf = await GdkPixbuf.Pixbuf.new_from_stream_async(
        response.body,
        null,
      );
      this.set_from_pixbuf(pixbuf);
    });
  }
}

export function load_image(image: Gtk.Image, url: string) {
  fetch(url, {
    method: "GET",
  }).then(async (response) => {
    const pixbuf = await GdkPixbuf.Pixbuf.new_from_stream_async(
      response.body,
      null,
    );
    image.set_from_pixbuf(pixbuf);
  });
}
