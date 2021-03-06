/*global L */
/*jslint nomen: true, sloppy : true, plusplus: true, vars: true, newcap: true, regexp: true*/

var ScrollWindow = function() {

    try {
        var number, scrollableView;

        scrollableView = Ti.UI.createScrollableView({
            showPagingControl : false,
            touchEnabled : false
        });

        var getEvents = function() {
            var items = [], events = [], photos = [];
            models.events.sync();
            events = models.events.get();
            photos = models.photos.get();
            //get the first photo for the event
            _.each(events, function(event) {
                var first, obj, contents;
                //if photos not stored already, add them to the events object
                if (!event.photos) {
                    event.photos = [];
                    _.each(photos, function(photo) {
                        //if the photo is of this event
                        if (photo.Events.indexOf(event.id) !== -1) {
                            event.photos.push(photo);
                        }
                    });
                }
                //get the first photo (for now)
                first = _.first(event.photos);
                obj = {
                    "path" : '/scrapbook/' + first.Name
                };
                //look up the photo details
                contents = models.contents.get(obj);
                if (contents && contents[0]) {
                    contents = contents[0];
                    contents.title = event.Name;
                    contents.subTitle = event.StartDate;
                    contents.type = 'event';
                    //TODO decorate contents with details of the event here
                    items.push(contents);
                }
            });
            //update the model with photos (assume that they have not been added)
            models.events.merge(events);
            return items;

        };

        var getPeople = function() {
            var items = [], people;
            models.people.sync();
            people = models.people.get();
            _.each(people, function(person) {
                var obj, contents;
                obj = {
                    "path" : '/scrapbook/' + person.KeyPhoto
                };
                contents = models.contents.get(obj);
                if (contents && contents[0]) {
                    contents = contents[0];
                    contents.title = person.Name;
                    contents.subTitle = person.Relationship;
                    contents.type = 'people';
                    //TODO decorate details of the person here
                    items.push(contents);
                }
            });

            return items;
        };

        var getPhotos = function() {
            var photos, items = [];
            photos = models.photos.get();
            _.each(photos, function(photo) {
                var obj, contents;
                obj = {
                    "path" : '/scrapbook/' + photo.Name
                };
                contents = models.contents.get(obj);
                if (contents && contents[0]) {
                    contents = contents[0];
                    contents.title = photo.Title;
                    contents.type = 'photo';
                    //TODO decorate details of the person here
                    items.push(contents);
                }
            });

            return items;
        };
        var getPostcards = function() {
            var cards = [], items = [], postcards = [];
            models.postcards.sync();
            postcards = models.postcards.get();
            _.each(postcards, function(postcard) {
                var card = models.photos.get({
                    'id' : postcard.PhotoID
                });
                if (card && card[0]) {
                    card = card[0];
                    card.title = postcard.Message;
                    cards.push(card);
                }
            });
            _.each(cards, function(card) {
                var obj, contents;
                obj = {
                    "path" : '/scrapbook/' + card.Name
                };
                contents = models.contents.get(obj);
                if (contents && contents[0]) {
                    contents = contents[0];
                    contents.title = card.title;
                    contents.type = 'postcard';
                    //TODO decorate details of the postcard here
                    items.push(contents);
                }
            });
            return items;
        };
        var addImages = function(args) {

            var contents, pictures = [], photos = [], views = [], events, people, postcards, folderName, folder, directoryContents;

            try {

                //refresh the directory contents
                folderName = Ti.App.Properties.getString('scrapbook') || Titanium.Filesystem.applicationDataDirectory + 'scrapbook';
                folder = Ti.Filesystem.getFile(folderName);
                directoryContents = folder.getDirectoryListing();

                //photos used throughout regardless of type
                models.photos.sync();

                switch (args) {
                    case 'events':
                        contents = getEvents();
                        break;
                    case 'people':
                        contents = getPeople();
                        break;
                    case 'postcards':
                        contents = getPostcards();
                        break;
                    default:
                        contents = getPhotos();
                        break;
                }

                //remove child windows from scrollableView

                if (scrollableView.children) {
                    _.each(scrollableView.children, function(kid) {
                        scrollableView.remove(kid);
                    });
                }

                if (!contents || _.size(directoryContents) === 0 || !directoryContents) {
                    throw new Error('no contents');
                }

                //get a list of photographs
                _.each(contents, function(item) {

                    if (item.mime_type.indexOf("image") !== -1) {
                        pictures.push({
                            file : item.path,
                            title : item.title || '',
                            subTitle : item.subTitle || '',
                            type : item.type
                        });
                    }

                });

                //check that the file exists and create an imageView if it does.
                _.each(pictures, function(picture) {

                    var view, image, lbl, subLbl, params = {};
                    var fileName = Titanium.Filesystem.applicationDataDirectory + picture.file;
                    var file = Ti.Filesystem.getFile(fileName);

                    if (picture.type === 'postcard') {
                        params = {
                            layout : 'horizontal',
                            width : '45%',
                            wrap : true,
                            left : 10,
                            height : '85%',
                            top : 10
                        };
                    } else {
                        params = {
                            layout : 'vertical',
                            width : '80%',
                            wrap : false,
                            height : 20
                        };
                    }

                    if (file.exists()) {
                        view = Ti.UI.createView({
                            backgroundColor : 'white',
                            height : '100%',
                            width : '100%',
                            layout : params.layout,
                            top : 10
                        });

                        lbl = Ti.UI.createLabel(_.defaults({
                            //if no title show nothing
                            text : picture.title ? (picture.title + (picture.subTitle ? ': ' + picture.subTitle : '')) : '',
                            font : {
                                fontSize : 20
                            },
                            color : 'black',
                            textAlign : 'center',
                            verticalAlign : Ti.UI.TEXT_VERTICAL_ALIGNMENT_CENTER
                        }, params));

                        image = Ti.UI.createImageView(_.defaults({
                            image : fileName,
                            height : '85%'
                        }, params));

                        view.add(image);
                        view.add(lbl);
                        views.push(view);
                    } else {
                        Ti.API.error(fileName + ' is missing');
                    }

                });

            } catch (ex) {

                msg = ex || ex.message;
                Ti.API.error(msg);

            } finally {

                number = _.size(views) || 0;
                return views;
            }

        };

        var t = 0;
        var interval = Ti.App.Properties.getInt('interval') || 3000;
        //get the window to autoscroll
        var intval;
        var scroll = true;
        var direction = 'left';

        //if there is some content, set up autoscrolling
        intval = setInterval(function(e) {
            if (scroll) {
                if (direction === 'left') {
                    //scroll up
                    if (t >= number) {
                        t = 0;
                    }
                    scrollableView.scrollToView(t);
                    t++;
                } else {
                    //scroll down
                    if (t === 0) {
                        t = number;
                    }
                    scrollableView.scrollToView(t);
                    t--;
                }
            }
        }, interval);

        this.view = scrollableView;

        this.setTimer = function() {
            var dialog, msg;
            //toggle scrolling on and off
            scroll = !scroll;
            if (scroll) {
                msg = 'scrolling has resumed. Double click screen to pause';
            } else {
                msg = 'scrolling has stopped.  Double click screen to resume';
            }
            Ti.API.debug('scrolling is ' + scroll);
            dialog = Ti.UI.createAlertDialog({
                message : msg,
                ok : 'ok'
            });
            dialog.show();
            setTimeout(function() {
                dialog.hide();
            }, interval);

        };

        this.setDirection = function(args) {
            direction = args || 'left';
            Ti.API.debug('scrolling is ' + direction);
        };

        this.setImages = function(args) {
            scrollableView.views = addImages(args);
            var views = scrollableView.getViews();
            //reset the scroller
            number = (_.size(views) - 1) || 0;
            t = 0;
        };

    } catch (ex) {

        msg = ex || ex.message;
        Ti.API.error(msg);

        return undefined;

    } finally {

        if (!(this instanceof ScrollWindow)) {
            return new ScrollWindow();
        }
    }

};

exports.create = function() {
    return new ScrollWindow();
};
