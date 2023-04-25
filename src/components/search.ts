import Gtk from "gi://Gtk?version=4.0";
import GObject from "gi://GObject";
import GLib from "gi://GLib";
import Adw from "gi://Adw";

import {
  get_more_search_results,
  search,
  SearchAlbum,
  SearchArtist,
  SearchContent,
  SearchOptions,
  SearchPlaylist,
  SearchResults,
  SearchSong,
  SearchVideo,
} from "../muse.js";
import { load_thumbnails } from "./webimage.js";
import { Paginator } from "./paginator.js";

export class InlineCard extends Gtk.ListBoxRow {
  static {
    GObject.registerClass({
      GTypeName: "InlineCard",
      Template:
        "resource:///org/example/TypescriptTemplate/components/search/inlinecard.ui",
      InternalChildren: [
        "avatar",
        "image",
        "image_overlay",
        "title",
        "explicit",
        "label_box",
        "type",
        // "second-line",
      ],
    }, this);
  }

  constructor() {
    super();
  }

  _avatar!: Adw.Avatar;
  _image!: Gtk.Image;
  _image_overlay!: Gtk.Overlay;
  _title!: Gtk.Label;
  _explicit!: Gtk.Label;
  _label_box!: Gtk.Box;
  _type!: Gtk.Label;
  _second_line!: Gtk.Box;

  image_size = 48;

  content?: SearchContent;

  show_avatar(show: boolean) {
    this._avatar.visible = show;
    this._image_overlay.visible = !show;
  }

  insert_middot() {
    this._label_box.append(Gtk.Label.new("·"));
  }

  insert_only_text(text: string) {
    this._label_box.append(Gtk.Label.new(text));
  }

  insert_text(text: string) {
    this.insert_middot();
    this.insert_only_text(text);
  }

  private set_song_or_video(track: SearchSong | SearchVideo) {
    this.content = track;

    load_thumbnails(this._image, track.thumbnails, this.image_size);

    this._title.label = track.title;
    this._explicit.set_visible(track.isExplicit);

    track.artists.forEach((artist) => {
      this.insert_text(artist.name);
    });

    if (track.duration) this.insert_text(track.duration);
  }

  set_song(song: SearchSong) {
    this.set_song_or_video(song);
    this._type.label = "Song";
  }

  set_video(video: SearchVideo) {
    // this._image.width_request = 85.5;
    this.set_song_or_video(video);
    this._type.label = "Video";
  }

  set_album(album: SearchAlbum) {
    this.content = album;

    load_thumbnails(this._image, album.thumbnails, this.image_size);

    this._title.label = album.title;
    this._explicit.set_visible(album.isExplicit);

    this._type.label = album.album_type;

    album.artists.forEach((artist) => {
      this.insert_text(artist.name);
    });
  }

  set_playlist(playlist: SearchPlaylist) {
    this.content = playlist;

    load_thumbnails(this._image, playlist.thumbnails, this.image_size);

    this._title.label = playlist.title;

    this._type.label = "Playlist";

    playlist.authors.forEach((artist) => {
      this.insert_text(artist.name);
    });
  }

  set_artist(artist: SearchArtist) {
    this.content = artist;

    this.show_avatar(true);
    load_thumbnails(this._avatar, artist.thumbnails, this.image_size);

    this._title.label = artist.name;

    this._type.set_visible(false);

    if (artist.subscribers) {
      this.insert_only_text(`${artist.subscribers} subscribers`);
    }
  }
}

function search_args_to_url(query: string, options: SearchOptions = {}) {
  const params = new URLSearchParams(Object.entries(options))
    .toString();
  let url_string = `muzika:search:${encodeURIComponent(query)}`;
  if (params) url_string += `?${params}`;

  return url_string;
}

export class SearchSection extends Gtk.Box {
  static {
    GObject.registerClass({
      GTypeName: "SearchSection",
      Template:
        "resource:///org/example/TypescriptTemplate/components/search/section.ui",
      InternalChildren: ["title", "more", "content"],
    }, this);
  }

  _title!: Gtk.Label;
  _more!: Gtk.Button;
  _content!: Gtk.ListBox;

  args: Parameters<typeof search>;
  show_more: boolean;

  constructor(
    options: { args: Parameters<typeof search>; show_more?: boolean },
  ) {
    super();

    this.args = options.args;
    this.show_more = options.show_more || false;
  }

  add_content(content: SearchContent) {
    let card = new InlineCard();

    switch (content.type) {
      case "song":
        card.set_song(content);
        break;
      case "video":
        card.set_video(content);
        break;
      case "album":
        card.set_album(content);
        break;
      case "artist":
        card.set_artist(content);
        break;
      case "playlist":
        card.set_playlist(content);
        break;
      default:
        console.error("Unknown search content type", content.type);
        return;
    }

    this._content.append(card);
  }

  set_category(category: SearchResults["categories"][0]) {
    this._title.label = category.title;

    if (category.results.length >= 0) {
      const url = search_args_to_url(
        this.args[0],
        {
          filter: category.filter ?? undefined,
          ...this.args[1],
        },
      );

      if (this.show_more) {
        this._more.visible = true;
        this._more.action_name = "app.navigate";
        this._more.action_target = GLib.Variant.new(
          "s",
          url,
        );
      }
    }

    category.results.forEach((result) => {
      this.add_content(result);
    });
  }
}

export class SearchPage extends Gtk.Box {
  static {
    GObject.registerClass({
      GTypeName: "SearchPage",
      Template:
        "resource:///org/example/TypescriptTemplate/components/search/page.ui",
      InternalChildren: ["scrolled", "content", "sections"],
    }, this);
  }

  _scrolled!: Gtk.ScrolledWindow;
  _content!: Gtk.Box;
  _sections!: Gtk.Box;

  paginator: Paginator;

  results?: SearchResults;
  args: Parameters<typeof search> = [""];

  constructor() {
    super({
      orientation: Gtk.Orientation.VERTICAL,
    });

    this.paginator = new Paginator();
    this.paginator.connect("activate", () => {
      this.search_more();
    });
    this._content.append(this.paginator);
  }

  show_results(results: SearchResults, args: Parameters<typeof search>) {
    this.results = results;
    this.args = args;

    this.paginator.set_reveal_child(results.continuation != null);

    results.categories.forEach((category) => {
      const section = new SearchSection({
        args,
        show_more: results.categories.length > 1,
      });
      section.set_category(category);
      this._sections.append(section);
    });
  }

  search(...args: Parameters<typeof search>) {
    return search(...args).then((results) => {
      this.results = results;
      this.show_results(results, args);
    });
  }

  loading = false;

  search_more() {
    if (this.loading || !this.results || !this.results?.continuation) return;

    this.loading = true;

    get_more_search_results(this.results.continuation, this.args[1] ?? {})
      .then((results) => {
        this.results!.continuation = results.continuation;

        const first_section = this._sections.get_first_child() as SearchSection;

        if (!first_section || !(first_section instanceof SearchSection)) {
          return;
        } else {
          results.results.forEach((content) => {
            this.results!.categories[0].results.push(content);
            first_section.add_content(content);
          });
        }

        this.paginator.loading = this.loading = false;
        this.paginator.set_reveal_child(results.continuation != null);
      });
  }
}
