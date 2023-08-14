import Gtk from "gi://Gtk?version=4.0";
import GObject from "gi://GObject";
import GLib from "gi://GLib";

import {
  ArtistRun,
  ParsedAlbum,
  ParsedPlaylist,
  ParsedSong,
  ParsedVideo,
  RelatedArtist,
  Thumbnail,
  WatchPlaylist,
} from "../../muse.js";
import { load_thumbnails } from "../webimage.js";
import { ParsedLibraryArtist } from "libmuse/types/parsers/library.js";
import { DynamicImageState } from "../dynamic-image.js";
import { PlaylistImage } from "../playlist-image.js";
import { pretty_subtitles } from "src/util/text.js";
import { MixedCardItem } from "../library/mixedcard.js";
import { DynamicImage2 } from "../dynamic-image-2.js";
import { SignalListeners } from "src/util/signal-listener.js";

enum CarouselImageType {
  AVATAR,
  DYNAMIC_IMAGE,
  DYNAMIC_PICTURE,
  PLAYLIST_IMAGE,
}

PlaylistImage;

export class CarouselCard extends Gtk.Box {
  static {
    GObject.registerClass({
      GTypeName: "CarouselCard",
      Template:
        "resource:///com/vixalien/muzika/ui/components/carousel/card.ui",
      InternalChildren: [
        "dynamic_image",
        "title",
        "subtitles",
        "explicit",
        "subtitle",
      ],
    }, this);
  }

  private _dynamic_image!: DynamicImage2;
  private _title!: Gtk.Label;
  private _subtitles!: Gtk.Box;
  private _explicit!: Gtk.Image;
  private _subtitle!: Gtk.Label;

  private content?: MixedCardItem;

  private listeners = new SignalListeners();
  private hover = new Gtk.EventControllerMotion();

  constructor() {
    super();

    this.listeners.connect(this.hover, "enter", () => {
      this._subtitle.add_css_class("hover");
    });

    this.listeners.connect(this.hover, "leave", () => {
      this._subtitle.remove_css_class("hover");
    });

    this._subtitles.add_controller(this.hover);

    this.listeners.connect(
      this._subtitle,
      "activate-link",
      (_: Gtk.Label, uri: string) => {
        if (uri && uri.startsWith("muzika:")) {
          this.activate_action(
            "navigator.visit",
            GLib.Variant.new_string(uri),
          );

          return true;
        }
      },
    );
  }

  reset() {
    this.set_align(Gtk.Align.FILL);

    this._title.label = "";
    this._subtitle.label = "";
    this._explicit.visible = false;
    this.subtitle_authors = [];
    this.content = undefined;

    this._dynamic_image.clear();
  }

  clear() {
    this._dynamic_image.clear();

    this.listeners.clear();

    if (this.hover.widget != null) {
      this._subtitles.remove_controller(this.hover);
    }
  }

  private setup_image(
    image_type: CarouselImageType,
    thumbnails: Thumbnail[],
    options?: Parameters<typeof load_thumbnails>[2],
  ) {
    switch (image_type) {
      case CarouselImageType.AVATAR:
        this._dynamic_image.avatar_thumbnails = thumbnails;
        break;
      case CarouselImageType.DYNAMIC_IMAGE:
        this._dynamic_image.persistent_play_button = true;
        this._dynamic_image.cover_thumbnails = thumbnails;
        break;
        // TODO: fix
      case CarouselImageType.PLAYLIST_IMAGE:
        this._dynamic_image.playlist = true;
        this._dynamic_image.cover_thumbnails = thumbnails;
        break;
      case CarouselImageType.DYNAMIC_PICTURE:
        this._dynamic_image.persistent_play_button = true;
        this._dynamic_image.video_thumbnails = thumbnails;
        break;
    }
  }

  private subtitle_authors: (string | ArtistRun)[] = [];
  private subtitle_nodes: string[] = [];

  private update_subtitle() {
    const subtitles = pretty_subtitles(
      this.subtitle_authors,
      this.subtitle_nodes,
    );

    this._subtitle.label = subtitles.markup;
    this._subtitle.tooltip_text = subtitles.plain;
  }

  private set_title(title: string) {
    this._title.tooltip_text = this._title.label = title;
    // this._avatar.text = title;
  }

  private set_subtitle(
    subtitle: string | (null | string | ArtistRun)[],
    nodes: (string | null)[] = [],
  ) {
    this.subtitle_authors = [];
    this.subtitle_nodes = nodes.filter(Boolean) as string[];

    if (typeof subtitle === "string") {
      this.subtitle_authors.push(subtitle);
    } else {
      for (const node of subtitle) {
        if (!node) continue;

        this.subtitle_authors.push(node);
      }
    }

    this.update_subtitle();
  }

  private show_explicit(explicit: boolean) {
    this._explicit.visible = explicit;
  }

  private setup_video(videoId: string | null) {
    if (videoId) {
      this._dynamic_image.setup_video(videoId);
    }
  }

  private setup_playlist(playlistId: string | null) {
    if (playlistId) {
      this._dynamic_image.setup_playlist(playlistId);
    }
  }

  private set_align(align: Gtk.Align) {
    this._subtitles.halign = align;
    this._title.halign = align;
  }

  show_song(song: ParsedSong) {
    this.content = song;

    this.set_title(song.title);
    this.set_subtitle(song.artists);
    this.show_explicit(song.isExplicit);

    this.setup_image(CarouselImageType.DYNAMIC_IMAGE, song.thumbnails);
    this.setup_video(song.videoId);
  }

  show_artist(artist: RelatedArtist) {
    this.content = artist;

    this.set_align(Gtk.Align.CENTER);
    this.set_title(artist.name);
    this.set_subtitle(artist.subscribers ?? "");

    this.setup_image(CarouselImageType.AVATAR, artist.thumbnails);
  }

  show_library_artist(artist: ParsedLibraryArtist) {
    this.content = artist;

    this.set_align(Gtk.Align.CENTER);
    this.set_title(artist.name);
    this.set_subtitle(artist.subscribers ?? artist.songs ?? "");

    this.setup_image(CarouselImageType.AVATAR, artist.thumbnails, {
      width: 160,
      upscale: true,
    });
  }

  show_video(video: ParsedVideo) {
    this.content = video;

    this.set_title(video.title);
    this.set_subtitle(video.artists ?? [], [video.views]);

    this.setup_image(CarouselImageType.DYNAMIC_PICTURE, video.thumbnails);
    this.setup_video(video.videoId);
  }

  show_inline_video(video: ParsedSong) {
    this.content = video;

    this.set_title(video.title);
    this.set_subtitle(video.artists ?? [], [video.views]);

    this.setup_image(CarouselImageType.DYNAMIC_PICTURE, video.thumbnails);
    this.setup_video(video.videoId);
  }

  show_playlist(playlist: ParsedPlaylist) {
    this.content = playlist;

    this.set_title(playlist.title);
    this.set_subtitle(playlist.description ?? "");

    this.setup_image(CarouselImageType.PLAYLIST_IMAGE, playlist.thumbnails);
    this.setup_playlist(playlist.playlistId);
  }

  show_watch_playlist(playlist: WatchPlaylist) {
    this.content = playlist;

    this.set_title(playlist.title);
    this.set_subtitle(_("Start Radio"));

    this.setup_image(CarouselImageType.DYNAMIC_IMAGE, playlist.thumbnails);
    this.setup_playlist(playlist.playlistId);
  }

  show_album(album: ParsedAlbum) {
    this.content = album;

    this.set_title(album.title);
    this.set_subtitle(album.artists ?? [], [album.year]);
    this.show_explicit(album.isExplicit);

    this.setup_image(CarouselImageType.PLAYLIST_IMAGE, album.thumbnails);
    this.setup_playlist(album.audioPlaylistId);
  }

  show_item(content: MixedCardItem) {
    switch (content.type) {
      case "song":
        this.show_song(content);
        break;
      case "artist":
        this.show_artist(content);
        break;
      case "library-artist":
        this.show_library_artist(content);
        break;
      case "video":
        this.show_video(content);
        break;
      case "inline-video":
        this.show_inline_video(content);
        break;
      case "playlist":
        this.show_playlist(content);
        break;
      case "album":
        this.show_album(content);
        break;
      case "watch-playlist":
        this.show_watch_playlist(content);
        break;
      default:
        console.warn(`Unknown content type: ${content.type}`);
    }
  }

  set_state(state: DynamicImageState) {
    this._dynamic_image.state = state;
  }
}
