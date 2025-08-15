{
  "nodes": [
    {
      "id": "band_1",
      "type": "band",
      "name": "The Neon Sparks",
      "aliases": ["Sparks"],
      "description": "A post-punk revival band from Detroit.",
      "image_url": "https://example.com/images/neonsparks.jpg",
      "link_urls": ["https://neonsparks.example"],
      "location": { "city": "Detroit", "country": "USA", "lat": 42.3314, "lng": -83.0458 },
      "start_date": "2003-05-12",
      "end_date": null,
      "tag_ids": ["genre_post_punk", "genre_indie"],
      "label_ids": ["label_1"],
      "member_ids": ["member_1", "member_2"],
      "origin": "Detroit, USA"
    },
    {
      "id": "band_2",
      "type": "band",
      "name": "Electric Howl",
      "description": "Garage rock trio from London.",
      "image_url": "https://example.com/images/electrichowl.jpg",
      "link_urls": [],
      "location": { "city": "London", "country": "UK", "lat": 51.5074, "lng": -0.1278 },
      "start_date": "2012-03-10",
      "end_date": null,
      "tag_ids": ["genre_garage_rock"],
      "label_ids": [],
      "member_ids": ["member_3"],
      "origin": "London, UK"
    },
    {
      "id": "member_1",
      "type": "member",
      "name": "Alex Vega",
      "description": "Lead guitarist and songwriter.",
      "image_url": "https://example.com/images/alexvega.jpg",
      "band_ids": ["band_1"],
      "roles": ["guitar", "vocals"],
      "location": { "city": "New York", "country": "USA", "lat": 40.7128, "lng": -74.0060 },
      "start_date": "2001-04-01",
      "end_date": null,
      "tag_ids": ["tag_guitarist"]
    },
    {
      "id": "member_2",
      "type": "member",
      "name": "Jules Harper",
      "description": "Drummer with jazz roots.",
      "image_url": "https://example.com/images/julesharper.jpg",
      "band_ids": ["band_1"],
      "roles": ["drums"],
      "location": { "city": "Cleveland", "country": "USA", "lat": 41.4993, "lng": -81.6944 },
      "start_date": "2001-04-01",
      "end_date": null,
      "tag_ids": ["tag_drummer"]
    },
    {
      "id": "member_3",
      "type": "member",
      "name": "Liam Cross",
      "description": "Bass player and backup vocals.",
      "image_url": "https://example.com/images/liamcross.jpg",
      "band_ids": ["band_2"],
      "roles": ["bass", "backing vocals"],
      "location": { "city": "London", "country": "UK", "lat": 51.5074, "lng": -0.1278 },
      "start_date": "2010-01-01",
      "end_date": null,
      "tag_ids": ["tag_bassist"]
    },
    {
      "id": "label_1",
      "type": "label",
      "name": "SilverTone Records",
      "image_url": "https://example.com/images/silvertone.jpg",
      "location": { "city": "New York", "country": "USA", "lat": 40.7128, "lng": -74.0060 },
      "start_date": "1998-06-10",
      "end_date": null,
      "artist_ids": ["band_1"]
    },
    {
      "id": "venue_cbgb",
      "type": "venue",
      "name": "CBGB",
      "location": { "city": "New York", "country": "USA", "lat": 40.7251, "lng": -73.9917 },
      "capacity": 350,
      "opened": "1973-12-01",
      "closed": "2006-10-15",
      "tag_ids": ["tag_iconic_venue"]
    },
    {
      "id": "venue_woodstock_site",
      "type": "venue",
      "name": "Woodstock (Bethel, NY)",
      "location": { "city": "Bethel", "country": "USA", "lat": 41.7011, "lng": -74.8802 },
      "capacity": 400000,
      "opened": "1969-08-15",
      "closed": null,
      "tag_ids": ["tag_iconic_venue"]
    },
    {
      "id": "event_rust_fest_2010",
      "type": "event",
      "name": "Rust Fest 2010",
      "date": "2010-08-15",
      "venue_id": "venue_cbgb",
      "band_ids": ["band_1"],
      "location": { "city": "New York", "country": "USA", "lat": 40.7251, "lng": -73.9917 }
    },
    {
      "id": "genre_post_punk",
      "type": "genre",
      "name": "Post-punk"
    },
    {
      "id": "genre_indie",
      "type": "genre",
      "name": "Indie"
    },
    {
      "id": "genre_garage_rock",
      "type": "genre",
      "name": "Garage rock"
    },
    {
      "id": "tag_guitarist",
      "type": "tag",
      "name": "Guitarist"
    },
    {
      "id": "tag_drummer",
      "type": "tag",
      "name": "Drummer"
    },
    {
      "id": "tag_bassist",
      "type": "tag",
      "name": "Bassist"
    },
    {
      "id": "tag_iconic_venue",
      "type": "tag",
      "name": "Iconic Venue"
    }
  ],
  "links": [
    {
      "id": "link_1",
      "type": "membership",
      "source": "member_1",
      "target": "band_1",
      "label": "Guitarist since 2003",
      "start_date": "2003-05-12",
      "end_date": null
    },
    {
      "id": "link_2",
      "type": "membership",
      "source": "member_2",
      "target": "band_1",
      "label": "Drummer since 2003",
      "start_date": "2003-05-12",
      "end_date": null
    },
    {
      "id": "link_3",
      "type": "label_signing",
      "source": "band_1",
      "target": "label_1",
      "label": "Signed in 2003",
      "start_date": "2003-01-01",
      "end_date": null
    },
    {
      "id": "link_4",
      "type": "performance",
      "source": "band_1",
      "target": "venue_cbgb",
      "label": "2010 Rust Fest",
      "start_date": "2010-08-15",
      "end_date": null
    },
    {
      "id": "link_5",
      "type": "event_headliner",
      "source": "event_rust_fest_2010",
      "target": "band_1",
      "label": "Headliner",
      "start_date": "2010-08-15",
      "end_date": null
    },
    {
      "id": "link_6",
      "type": "event_host_venue",
      "source": "event_rust_fest_2010",
      "target": "venue_cbgb",
      "label": "Hosted at",
      "start_date": "2010-08-15",
      "end_date": null
    },
    {
      "id": "link_7",
      "type": "collaboration",
      "source": "band_2",
      "target": "band_1",
      "label": "Tour 2015",
      "start_date": "2015-06-01",
      "end_date": "2015-08-31"
    },
    {
      "id": "link_8",
      "type": "genre_assignment",
      "source": "band_1",
      "target": "genre_post_punk",
      "label": "Genre",
      "start_date": null,
      "end_date": null
    },
    {
      "id": "link_9",
      "type": "genre_assignment",
      "source": "band_1",
      "target": "genre_indie",
      "label": "Genre",
      "start_date": null,
      "end_date": null
    },
    {
      "id": "link_10",
      "type": "genre_assignment",
      "source": "band_2",
      "target": "genre_garage_rock",
      "label": "Genre",
      "start_date": null,
      "end_date": null
    }
  ]
}
