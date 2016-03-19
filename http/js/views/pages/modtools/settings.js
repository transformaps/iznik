Iznik.Views.ModTools.Pages.Settings = Iznik.Views.Page.extend({
    modtools: true,

    template: "modtools_settings_main",

    events: function(){
        return _.extend({}, Iznik.Views.Page.prototype.events,{
            'change .js-configselect': 'configSelect',
            'click .js-addbulkop': 'addBulkOp',
            'click .js-addstdmsg': 'addStdMsg',
            'click .js-addconfig': 'addConfig',
            'click .js-deleteconfig': 'deleteConfig',
            'click .js-copyconfig': 'copyConfig',
            'click .js-addgroup': 'addGroup',
            'click .js-addlicense': 'addLicense',
            'click .js-hideall': 'hideAll',
            'click .js-mapsettings': 'mapSettings'
        });
    },

    addGroup: function() {
        var self = this;
        var v = new Iznik.Views.ModTools.Settings.AddGroup();
        v.render();
    },

    addLicense: function() {
        var self = this;
        var group = Iznik.Session.getGroup(self.selected);
        var v = new Iznik.Views.ModTools.Settings.AddLicense({
            model: group
        });

        // If we license, update the display.
        self.listenToOnce(v, 'modalCancelled modalClosed', function() {
            self.settingsGroup();
        });
        v.render();
    },

    hideAll: function() {
        var self = this;
        Iznik.Session.get('groups').each(function(group) {
            var membership = new Iznik.Models.Membership({
                groupid: group.get('id'),
                userid: Iznik.Session.get('me').id
            });

            membership.fetch().then(function() {
                var mod = new IznikModel(membership.get('settings'));
                mod.set('showmessages', 0);
                mod.set('showmembers', 0);
                mod.set('pushnotify', 0);
                var newdata = mod.toJSON();
                membership.save({
                    'settings': newdata
                }, {
                    patch: true
                });
            });
        });
    },

    deleteConfig: function() {
        var self = this;
        var v = new Iznik.Views.Confirm({
            model: self.modConfigModel
        });
        v.template = 'modtools_settings_delconfconfirm';

        self.listenToOnce(v, 'confirmed', function() {
            var configid = self.$('.js-configselect').val();
            self.modConfigModel.destroy().then(function() {
                self.render();
            });
        });

        v.render();
    },

    addConfig: function() {
        var self = this;
        var name = this.$('.js-addconfigname').val();

        if (name.length > 0) {
            // Create a new config and then reload.  Not very backboney.
            $.ajax({
                type: 'POST',
                url: API + 'modconfig',
                data: {
                    name: name
                },
                success: function(ret) {
                    if (ret.ret == 0) {
                        $('.js-configselect').selectPersist('set', ret.id);
                        self.render();
                    }
                }
            });
        }
    },

    copyConfig: function() {
        var self = this;
        var name = this.$('.js-copyconfigname').val();
        var configid = self.$('.js-configselect').val();

        if (name.length > 0) {
            // Create a new config copied from the currently selected one, and then reload.  Not very backboney.
            $.ajax({
                type: 'POST',
                url: API + 'modconfig',
                data: {
                    id: configid,
                    name: name
                },
                success: function(ret) {
                    if (ret.ret == 0) {
                        $('.js-configselect').selectPersist('set', ret.id);
                        self.render();
                    }
                }
            });
        }
    },

    settingsGroup: function() {
        var self = this;

        // Because we switch the form based on our group select we need to remove old events to avoid saving new
        // changes to the previous group.
        if (self.myGroupForm) {
            self.myGroupForm.undelegateEvents();
        }
        if (self.groupForm) {
            self.groupForm.undelegateEvents();
        }

        if (self.selected > 0) {
            var group = new Iznik.Models.Group({
                id: self.selected
            });

            group.fetch().then(function() {
                // Add license info
                var text;
                if (group.get('licenserequired')) {
                    if (!group.get('licensed')) {
                        text = '<div class="alert alert-warning">This group is using a trial license for 30 days from <abbr class="timeago" title="' + group.get('trial') + '"></abbr>.</div>'
                    } else {
                        text = 'This group is licensed until <abbr class="timeago" title="' + group.get('licenseduntil') + '"></abbr>.';
                    }

                    self.$('.js-addlicense').show();
                } else {
                    text = 'This group doesn\'t need a license.';
                    self.$('.js-addlicense').hide();
                }

                self.$('.js-licenceinfo').html(text);
                self.$('.timeago').timeago();

                // Our settings for the group are held in the membership, so fire off a request for that.
                var membership = new Iznik.Models.Membership({
                    groupid: self.selected,
                    userid: Iznik.Session.get('me').id
                });

                membership.fetch().then(function() {
                    self.myGroupModel = new IznikModel(membership.get('settings'));
                    var configoptions = [];
                    var configs = Iznik.Session.get('configs');
                    configs.each(function(config) {
                        configoptions.push({
                            label: config.get('name'),
                            value: config.get('id')
                        });
                    });
                    self.myGroupFields = [
                        {
                            name: 'configid',
                            label: 'ModConfig to use for this Group',
                            control: 'select',
                            options: configoptions
                        },
                        {
                            name: 'pushnotify',
                            label: 'Push notifications?',
                            control: 'radio',
                            extraClasses: [ 'row' ],
                            options: [{label: 'Yes', value: 1}, {label: 'No', value:0 }]
                        },
                        {
                            name: 'showmessages',
                            label: 'Show messages in All Groups?',
                            control: 'radio',
                            extraClasses: [ 'row' ],
                            options: [{label: 'Yes', value: 1}, {label: 'No', value:0 }]
                        },
                        {
                            name: 'showmembers',
                            label: 'Show members in All Groups?',
                            control: 'radio',
                            extraClasses: [ 'row' ],
                            options: [{label: 'Yes', value: 1}, {label: 'No', value:0 }]
                        },
                        {
                            control: 'button',
                            label: 'Save changes',
                            type: 'submit',
                            extraClasses: [ 'btn-success topspace botspace' ]
                        }
                    ];

                    self.myGroupForm = new Backform.Form({
                        el: $('#mygroupform'),
                        model: self.myGroupModel,
                        fields: self.myGroupFields,
                        events: {
                            'submit': function(e) {
                                // Send a PATCH to the server for settings.
                                e.preventDefault();
                                var newdata = self.myGroupModel.toJSON();
                                membership.save({
                                    'settings': newdata
                                }, {
                                    patch: true,
                                    success: _.bind(self.success, self),
                                    error: self.error
                                });
                                return(false);
                            }
                        }
                    });

                    self.myGroupForm.render();
                });

                // The global group settings.
                self.groupModel = new IznikModel(group.get('settings'));

                if (!self.groupModel.get('map')) {
                    self.groupModel.set('map', {
                        'zoom' : 12
                    });
                }

                self.groupFields = [
                    {
                        name: 'autoapprove.members',
                        label: 'Auto-approve pending members?',
                        control: 'radio',
                        options: [{label: 'Yes', value: 1}, {label: 'No', value:0 }]
                    },
                    {
                        name: 'duplicates.check',
                        label: 'Flag duplicate messages?',
                        control: 'radio',
                        options: [{label: 'Yes', value: 1}, {label: 'No', value:0 }]
                    },
                    {
                        name: 'spammers.check',
                        label: 'Check for spammer members?',
                        control: 'radio',
                        options: [{label: 'Yes', value: 1}, {label: 'No', value:0 }]
                    },
                    {
                        name: 'spammers.remove',
                        label: 'Auto-remove spammer members?',
                        control: 'radio',
                        options: [{label: 'Yes', value: 1}, {label: 'No', value:0 }]
                    },
                    {
                        name: 'keywords.offer',
                        label: 'OFFER keyword',
                        control: 'input'
                    },
                    {
                        name: 'keywords.taken',
                        label: 'TAKEN keyword',
                        control: 'input'
                    },
                    {
                        name: 'keywords.wanted',
                        label: 'WANTED keyword',
                        control: 'input'
                    },
                    {
                        name: 'keywords.received',
                        label: 'RECEIVED keyword',
                        control: 'input'
                    },
                    {
                        name: 'duplicates.offer',
                        label: 'OFFER duplicate period',
                        control: 'input',
                        type: 'number'
                    },
                    {
                        name: 'duplicates.taken',
                        label: 'TAKEN duplicate period',
                        control: 'input',
                        type: 'number'
                    },
                    {
                        name: 'duplicates.wanted',
                        label: 'WANTED duplicate period',
                        control: 'input',
                        type: 'number'
                    },
                    {
                        name: 'duplicates.received',
                        label: 'RECEIVED duplicate period',
                        control: 'input',
                        type: 'number'
                    },
                    {
                        name: 'map.zoom',
                        label: 'Default zoom for maps',
                        control: 'input',
                        type: 'number'
                    },
                    {
                        control: 'button',
                        label: 'Save changes',
                        type: 'submit',
                        extraClasses: [ 'btn-success topspace botspace' ]
                    }
                ];

                self.groupForm = new Backform.Form({
                    el: $('#groupform'),
                    model: self.groupModel,
                    fields: self.groupFields,
                    events: {
                        'submit': function(e) {
                            e.preventDefault();
                            var newdata = self.groupModel.toJSON();
                            group.save({
                                'settings': newdata
                            }, {
                                patch: true,
                                success: _.bind(self.success, self),
                                error: self.error
                            });
                            return(false);
                        }
                    }
                });

                self.groupForm.render();

                // Layout messes up a bit for radio buttons.
                self.groupForm.$(':radio').closest('.form-group').addClass('clearfix');

                if (group.get('type') == 'Freegle') {
                    self.$('.js-freegleonly').show();
                } else {
                    self.$('.js-freegleonly').hide();
                }
            });
        }
    },

    addStdMsg: function() {
        // Having no id in the model means we will do a POST when we save it, and therefore create it on the server.
        var model = new Iznik.Models.ModConfig.StdMessage({
            configid: self.$('.js-configselect').val()
        });
        var v = new Iznik.Views.ModTools.Settings.StdMessage({
            model: model
        });

        // When we close, update what's shown.
        this.listenToOnce(v, 'modalClosed', this.configSelect);

        v.render();
    },

    addBulkOp: function() {
        // Having no id in the model means we will do a POST when we save it, and therefore create it on the server.
        var model = new Iznik.Models.ModConfig.BulkOp({
            configid: self.$('.js-configselect').val()
        });
        var v = new Iznik.Views.ModTools.BulkOp({
            model: model
        });

        // When we close, update what's shown.
        this.listenToOnce(v, 'modalClosed', this.configSelect);

        v.render();
    },

    locked: function(model) {
        // Whether we can make changes to this config.
        if (!this.modConfigModel) {
            return(false);
        }
        var createdby = this.modConfigModel.get('createdby');
        var protected = this.modConfigModel.get('protected');

        return(protected && Iznik.Session.get('me').id != createdby);
    },

    configSelect: function() {
        var self = this;

        // Because we switch the form based on our config select we need to remove old events to avoid saving new
        // changes to the previous config.
        if (self.modConfigFormGeneral) {
            self.modConfigFormGeneral.undelegateEvents();
        }

        var selected = self.$('.js-configselect').val();

        if (selected > 0) {
            self.modConfigModel = new Iznik.Models.ModConfig({
                id: selected
            });

            self.modConfigModel.fetch().then(function() {
                // 0 values stripped.
                var prot = self.modConfigModel.get('protected');
                self.modConfigModel.set('protected', prot ? prot : 0);

                self.modConfigFieldsGeneral = [
                    {
                        name: 'name',
                        label: 'ModConfig name',
                        control: 'input',
                        helpMessage: 'If you want to change the name of the ModConfig, edit it in here.'
                    },
                    {
                        name: 'fromname',
                        label: '"From:" name in messages',
                        control: 'select',
                        options: [{label: 'My name', value: 'My display name (above)'}, {label: '$groupname Moderator', value: 'Groupname Moderator' }]
                    },
                    {
                        name: 'coloursubj',
                        label: 'Colour-code subjects?',
                        control: 'select',
                        options: [{label: 'Yes', value: 1}, {label: 'No', value: 0 }]
                    },
                    {
                        name: 'subjreg',
                        label: 'Regular expression for colour-coding',
                        disabled: self.locked,
                        control: 'input',
                        helpMessage: 'Regular expressions can be difficult; test changes at http://www.phpliveregex.com'
                    },
                    {
                        name: 'subjlen',
                        label: 'Subject length warning',
                        control: 'input',
                        disabled: self.locked,
                        type: 'number'
                    },
                    {
                        name: 'network',
                        label: 'Network name for $network substitution string',
                        control: 'input'
                    },
                    {
                        name: 'protected',
                        label: 'Locked to only allow changes by creator?',
                        control: 'select',
                        options: [
                            {label: 'Locked', value: 1},
                            {label: 'Unlocked', value: 0 }
                        ]
                    },
                    {
                        control: 'button',
                        label: 'Save changes',
                        type: 'submit',
                        extraClasses: [ 'btn-success topspace botspace' ]
                    }
                ];

                self.modConfigFormGeneral = new Backform.Form({
                    el: $('#modconfiggeneral'),
                    model: self.modConfigModel,
                    fields: self.modConfigFieldsGeneral,
                    events: {
                        'submit': function(e) {
                            e.preventDefault();
                            var newdata = self.modConfigModel.toJSON();
                            var attrs = self.modConfigModel.changedAttributes();
                            if (attrs) {
                                self.modConfigModel.save(attrs, {
                                    patch: true,
                                    success: _.bind(self.success, self),
                                    error: self.error
                                });
                            }
                            return(false);
                        }
                    }
                });

                // The visibility is not returned in the fetch, only in the session.
                var configs = Iznik.Session.get('configs');
                var cansee = 'of magic pixies.';
                configs.each(function(thisone) {
                    if (thisone.get('id') == selected) {
                        switch (thisone.get('cansee')) {
                            case 'Created':
                                cansee = "you created it.";
                                break;
                            case 'Default':
                                cansee = "it's a global default configuration.";
                                break;
                            case 'Shared':
                                cansee = "it's used by " + thisone.get('sharedby').displayname + " on " +
                                    thisone.get('sharedon').namedisplay + ', where you are also a moderator.';
                                break;
                        }
                    }
                });

                self.modConfigFormGeneral.render();
                self.$('.js-cansee').html("You can see this ModConfig because " + cansee);

                var locked = self.locked();

                // Add cc options
                _.defer(function() {
                    _.each(['reject', 'followup', 'rejmemb', 'follmemb'], function(tag) {
                        function createForm(tag) {
                            var form = new Backform.Form({
                                el: $('.js-cc' + tag + 'form'),
                                model: self.modConfigModel,
                                fields: [
                                    {
                                        name: 'cc' + tag + 'to',
                                        label: 'BCC to',
                                        disabled: self.locked,
                                        control: 'select',
                                        options: [
                                            {label: 'Nobody', value: 'Nobody'},
                                            {label: 'Me', value: 'Me'},
                                            {label: 'Specific address', value: 'Specific'}
                                        ]
                                    },
                                    {
                                        name: 'cc' + tag + 'addr',
                                        label: 'Specific address',
                                        disabled: self.locked,
                                        placeholder: 'Please enter the specific email address',
                                        type: 'email',
                                        control: 'input'
                                    },
                                    {
                                        control: 'button',
                                        disabled: self.locked,
                                        label: 'Save changes',
                                        type: 'submit',
                                        extraClasses: ['btn-success topspace botspace']
                                    }
                                ],
                                events: {
                                    'submit': function (e) {
                                        e.preventDefault();
                                        var newdata = self.modConfigModel.toJSON();
                                        var attrs = self.modConfigModel.changedAttributes();

                                        if (attrs) {
                                            self.modConfigModel.save(attrs, {
                                                patch: true,
                                                success: _.bind(self.success, self),
                                                error: self.error
                                            });
                                        } else {
                                            self.success();
                                        }

                                        return (false);
                                    }
                                }
                            });

                            form.render();

                            // Disabled doesn't get set correctly
                            $('.js-cc' + tag + 'form select, .js-cc' + tag + 'form button').prop('disabled', self.locked());
                            //console.log("Disable", $('.js-cc' + tag + 'form select, .js-cc' + tag + 'form button'));

                            // We want to dynamically disable, which backform doesn't.
                            function handleChange(self, tag) {
                                return(function(e) {
                                    var val = self.modConfigModel.get('cc' + tag + 'to');
                                    var inp = self.$("input[name='cc" + tag + "addr']");
                                    inp.prop('disabled', val != 'Specific' || self.locked());
                                });
                            }

                            self.listenTo(self.modConfigModel, 'change:cc' + tag + 'to', handleChange(self, tag));

                            var targ = self.$("input[name='cc" + tag + "addr']");
                            var disabled = self.$("select[name='cc" + tag + "to']").val().indexOf('Specific') == -1;
                            targ.prop('disabled', disabled || self.locked());
                        }

                        createForm(tag);
                    });
                })

                // Add buttons for the standard messages in the various places.
                var sortmsgs = orderedMessages(self.modConfigModel.get('stdmsgs'), self.modConfigModel.get('messageorder'));
                self.$('.js-stdmsgspending, .js-stdmsgsapproved, .js-stdmsgspendingmembers, .js-stdmsgsmembers').empty();

                _.each(sortmsgs, function (stdmsg) {
                    // Find the right place to add the button.
                    var container = null;
                    switch (stdmsg.action) {
                        case 'Approve':
                        case 'Reject':
                        case 'Delete':
                        case 'Leave':
                        case 'Edit':
                            container = ".js-stdmsgspending";
                            break;
                        case 'Leave Approved Message':
                        case 'Delete Approved Message':
                            container = ".js-stdmsgsapproved";
                            break;
                        case 'Approve Member':
                        case 'Reject Member':
                        case 'Leave Member':
                            container = ".js-stdmsgspendingmembers";
                            break;
                        case 'Delete Approved Member':
                            container = ".js-stdmsgsmembers";
                        case 'Leave Approved Member':
                            container = ".js-stdmsgsmembers";
                            break;
                    }

                    stdmsg.protected = locked;

                    var v = new Iznik.Views.ModTools.StdMessage.SettingsButton({
                        model: new Iznik.Models.ModConfig.StdMessage(stdmsg),
                        config: self.modConfigModel
                    });

                    self.listenTo(v, 'buttonChange', self.configSelect);

                    var el = v.render().el;
                    $(el).data('buttonid', stdmsg.id);
                    self.$(container).append(el);
                });

                // Make the buttons sortable.
                self.$('.js-sortable').each(function(index, value) {
                    Sortable. create(value, {
                        onEnd: function(evt) {
                            // We've dragged a button.  Find the New Order.
                            var order = [];
                            self.$('.js-stdbutton').each(function(index, button) {
                                var id = $(button).data('buttonid');
                                order.push(id);
                            });

                            // We have the New Order.  Undivided joy.
                            var neworder = JSON.stringify(order);
                            self.modConfigModel.set('messageorder', neworder);
                            self.modConfigModel.save({
                                'messageorder': neworder
                            }, {patch: true});
                        }
                    });
                });

                // Add the bulkops
                self.$('.js-bulkops').empty();

                _.each(self.modConfigModel.get('bulkops'), function (bulkop) {
                    bulkop.protected = locked;

                    var v = new Iznik.Views.ModTools.BulkOp.Button({
                        model: new Iznik.Models.ModConfig.BulkOp(bulkop),
                        config: self.modConfigModel
                    });

                    self.listenTo(v, 'buttonChange', self.configSelect);

                    var el = v.render().el;
                    $(el).data('buttonid', bulkop.id);
                    self.$('.js-bulkops').append(el);
                });

                if (locked) {
                    // We can't change anything, except to select another config, copy or add
                    self.$('.js-notconfigselect input,.js-notconfigselect select,.js-notconfigselect button, .js-addbulkop').prop('disabled', true).addClass('disabled');
                    self.$('.js-copyconfigname, .js-copyconfig, .js-addconfigname, .js-addconfig').prop('disabled', false).removeClass('disabled');
                    self.$('.js-locked').show();
                } else {
                    self.$('.js-notconfigselect input,.js-notconfigselect select,.js-notconfigselect button, .js-addbulkop').prop('disabled', false).removeClass('disabled');
                    self.$('.js-locked').hide();
                }

                // Layout messes up a bit for radio buttons.
                self.$('input').closest('.form-group').addClass('clearfix');
            });
        }
    },

    success: function(model, response, options) {
        console.log("Response", response);
        if (response.ret == 0) {
            (new Iznik.Views.ModTools.Settings.Saved()).render();
        } else {
            this.error(model, response, options);
        }
    },

    error: function(model, response, options) {
        console.log("Error", model, response, options);

        if (response.ret == 10) {
            (new Iznik.Views.ModTools.Settings.VerifyRequired({
                model: new IznikModel(response)
            })).render();
        } else {
            (new Iznik.Views.ModTools.Settings.SaveFailed({
                model: new IznikModel(response)
            })).render();
        }
    },

    mapSettings: function() {
        Router.navigate('/modtools/settings/' + this.selected + '/map', true);
    },

    render: function() {
        var self = this;

        Iznik.Views.Page.prototype.render.call(this);

        // Fetch the session to pick up any changes in the list of configs etc.
        self.listenToOnce(Iznik.Session, 'isLoggedIn', function() {
            self.groupSelect = new Iznik.Views.Group.Select({
                systemWide: false,
                all: false,
                mod: true,
                choose: true,
                id: 'settingsGroupSelect'
            });

            self.listenTo(self.groupSelect, 'selected', function(selected) {
                self.selected = selected;
                self.settingsGroup();
            });

            // Render after the listen to as they are called during render.
            self.$('.js-groupselect').html(self.groupSelect.render().el);

            // Personal settings
            var me = Iznik.Session.get('me');
            var settings = presdef('settings', me, null);
            settings = (settings == null || settings.length == 0) ? {
                'playbeep': 1
            } : settings;

            self.personalModel = new IznikModel({
                id: me.id,
                displayname: me.displayname,
                fullname: me.fullname,
                email: me.email,
                settings: settings
            });

            var personalFields = [
                {
                    name: 'displayname',
                    label: 'Display Name',
                    control: 'input',
                    helpMessage: 'This is your name as displayed publicly to other users, including in the $myname substitution string.'
                },
                {
                    name: 'email',
                    label: 'Email',
                    type: 'email',
                    control: 'input'
                },
                {
                    name: 'settings.playbeep',
                    label: 'Beep',
                    control: 'select',
                    options: [{label: 'Off', value: 0 }, {label: 'Play beep for new work', value: 1}]
                },
                {
                    control: 'button',
                    label: 'Save changes',
                    type: 'submit',
                    extraClasses: [ 'topspace btn-success' ]
                }
            ];

            var personalForm = new Backform.Form({
                el: $('#personalform'),
                model: self.personalModel,
                fields: personalFields,
                events: {
                    'submit': function(e) {
                        e.preventDefault();
                        var newdata = self.personalModel.toJSON();
                        console.log("Save personal", newdata, self.personalModel);
                        Iznik.Session.save(newdata, {
                            patch: true,
                            success: _.bind(self.success, self),
                            error: self.error
                        });
                        return(false);
                    }
                }
            });

            personalForm.render();

            var configs = Iznik.Session.get('configs');
            configs.each(function(config) {
                self.$('.js-configselect').append('<option value=' + config.get('id') + '>' +
                $('<div />').text(config.get('name')).html() + '</option>');
            });

            self.$(".js-configselect").selectpicker();
            self.$(".js-configselect").selectPersist();

            self.configSelect();

            // We seem to need to redelegate, otherwise the change event is not caught.
            self.delegateEvents();
        });
    }
});

Iznik.Views.ModTools.StdMessage.SettingsButton = Iznik.Views.ModTools.StdMessage.Button.extend({
    // We override the events, so we get the same visual display but when we click do an edit of the settings.
    events: {
        'click .js-approve': 'edit',
        'click .js-reject': 'edit',
        'click .js-delete': 'edit',
        'click .js-hold': 'edit',
        'click .js-release': 'edit',
        'click .js-edit': 'edit',
        'click .js-leave': 'edit'
    },

    edit: function() {
        var self = this;
        var v = new Iznik.Views.ModTools.Settings.StdMessage({
            model: this.model
        });

        // If we close a modal we might need to refresh.
        this.listenToOnce(v, 'modalClosed', function() {
            self.trigger('buttonChange');
        });
        v.render();
    }
});

// We use a custom control for action so that we can add groups into what would otherwise be a long list.
//
// Defer for our template expansion to work which requires DOM elements.
Iznik.Views.ModTools.Settings.ActionSelect = Backform.InputControl.extend({
    defaults: {
        type: 'actionselect'
    },

    events: {
        'change .js-action': 'getValueFromDOM'
    },

    getValueFromDOM: function() {
        this.model.set('action', this.$('.js-action').val());
    },

    render: function() {
        this.template = window.template("modtools_settings_action");
        Backform.InputControl.prototype.render.apply(this, arguments);
        return(this);
    }
});

Iznik.Views.ModTools.Settings.StdMessage = Iznik.Views.Modal.extend({
    template: 'modtools_settings_stdmsg',

    events: {
        'click .js-save': 'save',
        'click .js-delete': 'delete'
    },

    save: function() {
        var self = this;

        self.model.save().then(function() {
            self.close();
        });
    },

    delete: function() {
        var self = this;

        self.model.destroy().then(function() {
            self.close();
        })
    },

    render: function() {
        var self = this;

        this.$el.html(window.template(this.template)(this.model.toJSON2()));

        // We want to refetch the model to make sure we edit the most up to date settings.
        self.model.fetch().then(function() {
            self.fields = [
                {
                    name: 'title',
                    label: 'Title',
                    control: 'input'
                },
                {
                    name: 'action',
                    label: 'Action',
                    control: Iznik.Views.ModTools.Settings.ActionSelect
                },
                {
                    name: 'edittext',
                    label: 'Edit Text (only for Edits)',
                    options: [{label: 'Unchanged', value: 'Unchanged'}, {label: 'Correct Case', value: 'Correct Case' }],
                    disabled: function(model) { return(model.get('action') != 'Edit')},
                    control: Backform.SelectControl.extend({
                        initialize: function() {
                            Backform.InputControl.prototype.initialize.apply(this, arguments);
                            this.listenTo(this.model, "change:action", this.render);
                        }
                    })
                },
                {
                    name: 'autosend',
                    label: 'Autosend',
                    control: 'select',
                    options: [{label: 'Edit before send', value: 0 }, {label: 'Send immediately', value: 1}]
                },
                {
                    name: 'rarelyused',
                    label: 'How often do you use this?',
                    control: 'select',
                    options: [{label: 'Frequently', value: 0}, {label: 'Rarely', value: 1 }]
                },
                {
                    name: 'newmodstatus',
                    label: 'Change Yahoo Moderation Status?',
                    control: 'select',
                    options: [
                        {label: 'Unchanged', value: 'UNCHANGED'},
                        {label: 'Moderated', value: 'MODERATED'},
                        {label: 'Group Settings', value: 'DEFAULT'},
                        {label: 'Can\'t Post', value: 'PROHIBITED'},
                        {label: 'Unmoderated', value: 'UNMODERATED'},
                    ]
                },
                {
                    name: 'newdelstatus',
                    label: 'Change Yahoo Delivery Settings?',
                    control: 'select',
                    options: [
                        {label: 'Unchanged', value: 'UNCHANGED'},
                        {label: 'Daily Digest', value: 'DIGEST'},
                        {label: 'Web Only', value: 'NONE'},
                        {label: 'Individual Emails', value: 'SINGLE'},
                        {label: 'Special Notices', value: 'ANNOUNCEMENT'}
                    ]
                },
                {
                    name: 'subjpref',
                    label: 'Subject Prefix',
                    control: 'input'
                },
                {
                    name: 'subjsuff',
                    label: 'Subject Suffix',
                    control: 'input'
                },
                {
                    name: 'body',
                    label: 'Message Body',
                    control: 'textarea',
                    extraClasses: [ 'js-textarea' ]
                }
            ];

            self.form = new Backform.Form({
                el: $('#js-form'),
                model: self.model,
                fields: self.fields
            });

            self.form.render();

            self.$('.js-action').val(self.model.get('action'));

            // Layout messes up a bit.
            self.$('.form-group').addClass('clearfix');
            self.$('.js-textarea').attr('rows', 10);

            // Turn on spell-checking
            self.$('textarea, input:text').attr('spellcheck', true);
        });

        this.open(null);

        return(this);
    }
});

Iznik.Views.ModTools.Settings.Saved = Iznik.Views.Modal.extend({
    template: 'modtools_settings_saved',
    render: function() {
        Iznik.Views.Modal.prototype.render.call(this);
        _.delay(_.bind(this.close, this), 10000);
    }
});

Iznik.Views.ModTools.Settings.SaveFailed = Iznik.Views.Modal.extend({
    template: 'modtools_settings_savefailed'
});

Iznik.Views.ModTools.Settings.VerifyRequired = Iznik.Views.Modal.extend({
    template: 'modtools_settings_verifyrequired'
});

Iznik.Views.ModTools.Settings.VerifyFailed = Iznik.Views.Modal.extend({
    template: 'modtools_settings_verifyfailed'
});

Iznik.Views.ModTools.Settings.VerifySucceeded = Iznik.Views.Modal.extend({
    template: 'modtools_settings_verifysucceeded'
});

Iznik.Views.ModTools.Settings.AddGroup = Iznik.Views.Modal.extend({
    template: 'modtools_settings_addgroup',

    events: {
        'click .js-add': 'add'
    },

    createFailed: function() {
        var v = new Iznik.Views.ModTools.Settings.CreateFailed();
        v.render();
    },

    add: function() {
        var self = this;

        $.ajax({
            type: 'POST',
            url: API + 'group',
            data: {
                action: 'Create',
                name: self.diff[self.$('.js-grouplist').val()],
                type: self.$('.js-type').val()
            }, success: function(ret) {
                if (ret.ret == 0) {
                    var v = new Iznik.Views.ModTools.Settings.CreateSucceeded();
                    v.render();

                    // Trigger another list to force the invite and hence the add.
                    IznikPlugin.listYahooGroups();
                } else {
                    self.createFailed();
                }
            }, error: self.createFailed
        });
    },

    render: function() {
        var self = this;

        Iznik.Views.Modal.prototype.render.call(this);

        // Get the list of groups from Yahoo.
        if (IznikPlugin.yahooGroups.length == 0) {
            self.$('.js-noplugin').removeClass('hidden');
            self.$('.js-add').addClass('disabled');
        } else {
            // Find the groups which aren't on ModTools.
            var groups = [];
            Iznik.Session.get('groups').each(function(group) {
                groups.push(group.get('nameshort').toLowerCase());
            });

            self.diff = _.difference(IznikPlugin.yahooGroups, groups);
            _.each(self.diff, function(group, ind) {
                self.$('.js-grouplist').append('<option value="' + ind + '" />');
                self.$('.js-grouplist option:last').html(group);
            });
            self.$('.js-plugin').removeClass('hidden');
        }
    }
});

Iznik.Views.ModTools.Settings.CreateSucceeded = Iznik.Views.Modal.extend({
    template: 'modtools_settings_createsucceeded'
});

Iznik.Views.ModTools.Settings.CreateFailed = Iznik.Views.Modal.extend({
    template: 'modtools_settings_createfailed'
});

Iznik.Views.ModTools.BulkOp = Iznik.Views.Modal.extend({
    template: 'modtools_settings_bulkop',

    events: {
        'click .js-save': 'save',
        'click .js-delete': 'delete',
        'change .js-criterion': 'criterion'
    },

    criterion: function() {
        var disabled = this.$('.js-criterion').val().indexOf('BouncingFor') == -1;
        this.$('.js-bouncingfor').prop('disabled', disabled);
    },

    save: function() {
        var self = this;

        self.model.save().then(function() {
            self.close();
        });
    },

    delete: function() {
        var self = this;

        self.model.destroy().then(function() {
            self.close();
        })
    },

    render: function() {
        var self = this;

        this.$el.html(window.template(this.template)(this.model.toJSON2()));

        // We want to refetch the model to make sure we edit the most up to date settings.
        self.model.fetch().then(function() {
            self.fields = [
                {
                    name: 'title',
                    label: 'Title',
                    control: 'input'
                },
                {
                    name: 'runevery',
                    label: 'Frequency',
                    control: 'select',
                    options: [
                        {label: 'Never', value: 0 },
                        {label: 'Hourly', value: 1 },
                        {label: 'Daily', value: 24},
                        {label: 'Weekly', value: 168},
                        {label: 'Monthly', value: 744}
                    ]
                },
                {
                    name: 'action',
                    label: 'Action',
                    control: 'select',
                    options: [
                        {label: 'Yahoo Unbounce', value: 'Unbounce' },
                        {label: 'Yahoo Remove from Group', value: 'Remove'},
                        {label: 'Yahoo Change to Group Settings', value: 'ToGroup'},
                        {label: 'Yahoo Change to Special Notices', value: 'ToSpecialNotices'}
                    ]
                },
                {
                    name: 'set',
                    label: 'Apply To',
                    control: 'select',
                    options: [
                        {label: 'Members', value: 'Members' }
                    ]
                },
                {
                    name: 'criterion',
                    label: 'Filter',
                    control: 'select',
                    options: [
                        {label: 'Bouncing', value: 'Bouncing' },
                        {label: 'Bouncing For', value: 'BouncingFor' },
                        {label: 'All', value: 'All' },
                        {label: 'Web Only', value: 'WebOnly' }
                    ],
                    extraClasses: [ 'js-criterion' ]
                },
                {
                    name: 'bouncingfor',
                    label: 'Bouncing For (days)',
                    control: 'input',
                    type: 'number',
                    extraClasses: [ 'js-bouncingfor' ]
                }
            ];

            self.form = new Backform.Form({
                el: $('#js-form'),
                model: self.model,
                fields: self.fields
            });

            self.form.render();
            self.criterion();

            self.$('.js-action').val(self.model.get('action'));

            // Layout messes up a bit.
            self.$('.form-group').addClass('clearfix');
            self.$('.js-textarea').attr('rows', 10);

            // Turn on spell-checking
            self.$('textarea, input:text').attr('spellcheck', true);
        });

        this.open(null);

        return(this);
    }
});

Iznik.Views.ModTools.BulkOp.Button = IznikView.extend({
    template: 'modtools_settings_bulkopbutton',

    tagName: 'li',

    events: {
        'click .js-edit': 'edit'
    },

    edit: function() {
        var self = this;

        var v = new Iznik.Views.ModTools.BulkOp({
            model: this.model
        });

        // If we close a modal we might need to refresh.
        this.listenToOnce(v, 'modalClosed', function() {
            self.trigger('buttonChange');
        });
        v.render();
    }
});

Iznik.Views.ModTools.Settings.AddLicense = Iznik.Views.Modal.extend({
    template: 'modtools_settings_addlicense',

    events: {
        'click .js-add': 'add',
        'click .js-close': 'close',
        'click .js-cancel': 'cancel'
    },

    licenseFailed: function() {
        var v = new Iznik.Views.ModTools.Settings.LicenseFailed();
        v.render();
    },

    add: function() {
        var self = this;

        $.ajax({
            type: 'POST',
            url: API + 'group',
            data: {
                action: 'AddLicense',
                id: self.model.get('id'),
                voucher: self.$('.js-voucher').val().trim()
            }, success: function(ret) {
                if (ret.ret == 0) {
                    var v = new Iznik.Views.ModTools.Settings.LicenseSucceeded();
                    v.render();
                } else {
                    self.licenseFailed();
                }
            }, error: self.licenseFailed
        });
    }
});

Iznik.Views.ModTools.Settings.LicenseSucceeded = Iznik.Views.Modal.extend({
    template: 'modtools_settings_licensesucceeded'
});

Iznik.Views.ModTools.Settings.LicenseFailed = Iznik.Views.Modal.extend({
    template: 'modtools_settings_licensefailed'
});

Iznik.Views.ModTools.Pages.MapSettings = Iznik.Views.Page.extend({
    modtools: true,

    selected: null,

    template: "modtools_settings_map",

    events: {
        'click .js-save': 'save',
        'click .js-delete': 'exclude'
    },

    save: function() {
        var self = this;
        var wkt = self.$('.js-wkt').val();
        var name = self.$('.js-name').val();

        var v = new Iznik.Views.PleaseWait({
            timeout: 100
        });
        v.render();

        if (self.selected) {
            // Existing location - patch it.
            var id = self.selected.get('id');
            self.selected.set('polygon', wkt);

            var changes = {
                id: id,
                polygon: wkt
            };
            self.selected.save(changes, {
                patch: true
            }).then(function() {
                v.close();
            });
        } else {
            // New location - create it.
            $.ajax({
                url: API + 'locations',
                type: 'PUT',
                data: {
                    name: name,
                    polygon: wkt
                }, complete: function() {
                    v.close();
                    self.getAreas();
                }
            })
        }
    },

    exclude: function() {
        var self = this;

        if (self.selected) {
            $.ajax({
                url: API + '/locations/' + self.selected.get('id'),
                type: 'POST',
                data: {
                    action: 'Exclude',
                    byname: false,
                    groupid: self.options.groupid
                }, complete: function() {
                    self.getAreas();
                }
            });
        }
    },

    features: [],

    clearMap: function() {
        var i;

        this.$('.js-wkt').val('');

        for (i in this.features) {
            if (this.features.hasOwnProperty(i)) {
                this.features[i].setMap(null);
            }
        }

        this.features.length = 0;
    },

    getAreas: function() {
        var self = this;

        // No longer got one selected.
        self.selected = null;
        self.$('.js-wkt').val('');
        self.$('.js-name').val('');
        self.$('.js-name').prop('readonly', false);

        _.each(self.features, function(feature) {
            feature.setOptions({strokeColor: '#990000'});
        });

        var bounds = self.map.getBounds();
        self.areas = new Iznik.Collections.Locations({
            swlat: bounds.getSouthWest().lat(),
            swlng: bounds.getSouthWest().lng(),
            nelat: bounds.getNorthEast().lat(),
            nelng: bounds.getNorthEast().lng()
        });

        var v = new Iznik.Views.PleaseWait({
            timeout: 100
        });
        v.render();

        self.areas.fetch().then(function() {
            self.clearMap();
            self.areas.each(function(area) {
                var poly = area.get('polygon');
                var lat = area.get('lat');
                var lng = area.get('lng');

                if (poly || lat || lng) {
                    if (poly) {
                        self.mapWKT(poly, area);
                    } else {
                        var wkt = 'POINT(' + lng + ' ' + lat + ')';
                        self.mapWKT(wkt, area);
                    }
                }
            });
            v.close();
        })
    },

    updateWKT: function(obj) {
        console.log("Update", self, obj);
        var wkt = new Wkt.Wkt();
        wkt.fromObject(obj);
        this.$('.js-wkt').val(wkt.write());
    },

    changeHandler: function(self, area, obj) {
        return(function(n) {
            self.selected = area;
            self.$('.js-id').val('');
            self.$('.js-wkt').val('');

            if (area) {
                self.$('.js-name').val(area.get('name'));
                self.$('.js-wkt').val(area.get('polygon'));
                self.$('.js-id').html(area.get('id'));
            }

            // We can only edit the name on a new area.
            self.$('.js-name').prop('readonly', area != null);

            self.updateWKT.call(self, obj);

            // Set the border colour so it's obvious which one we're on.
            _.each(self.features, function(feature) {
                feature.setOptions({strokeColor: '#990000'});
            });
            obj.setOptions({strokeColor: 'blue'});
        });
    },

    mapWKT: function(wktstr, area) {
        var self = this;
        var wkt = new Wkt.Wkt();

        try { // Catch any malformed WKT strings
            wkt.read(wktstr);
        } catch (e1) {
            try {
                wkt.read(el.value.replace('\n', '').replace('\r', '').replace('\t', ''));
            } catch (e2) {
                if (e2.name === 'WKTError') {
                    console.error("Ignore invalid WKT", wktstr);
                    return;
                }
            }
        }

        var obj = wkt.toObject(this.map.defaults); // Make an object

        // Add listeners for overlay editing events
        if (!Wkt.isArray(obj) && wkt.type !== 'point') {
            // New vertex is inserted
            google.maps.event.addListener(obj.getPath(), 'insert_at', self.changeHandler(self, area, obj));

            // Existing vertex is removed (insertion is undone)
            google.maps.event.addListener(obj.getPath(), 'remove_at', self.changeHandler(self, area, obj));

            // Existing vertex is moved (set elsewhere)
            google.maps.event.addListener(obj.getPath(), 'set_at', self.changeHandler(self, area, obj));
        }

        // Click to show info
        google.maps.event.addListener(obj, 'click', self.changeHandler(self, area, obj));

        self.features.push(obj);

        var mapLabel = new MapLabel({
            text: area.get('name'),
            position: new google.maps.LatLng(area.get('lat'), area.get('lng')),
            map: self.map,
            fontSize: 20,
            fontColor: 'red',
            align: 'right'
        });

        area.set('label', mapLabel);

        var bounds = new google.maps.LatLngBounds();

        if (Wkt.isArray(obj)) { // Distinguish multigeometries (Arrays) from objects
            for (i in obj) {
                if (obj.hasOwnProperty(i) && !Wkt.isArray(obj[i])) {
                    obj[i].setMap(self.map);
                    this.features.push(obj[i]);

                    if(wkt.type === 'point' || wkt.type === 'multipoint')
                        bounds.extend(obj[i].getPosition());
                    else
                        obj[i].getPath().forEach(function(element,index){bounds.extend(element)});
                }
            }

            self.features = self.features.concat(obj);
        } else {
            obj.setMap(this.map); // Add it to the map
            self.features.push(obj);

            if(wkt.type === 'point' || wkt.type === 'multipoint')
                bounds.extend(obj.getPosition());
            else
                obj.getPath().forEach(function(element,index){bounds.extend(element)});
        }

        return obj;
    },

    render: function() {
        var self = this;

        Iznik.Views.Page.prototype.render.call(this);

        var v = new Iznik.Views.Help.Box();
        v.template = 'modtools_settings_maphelp';
        this.$('.js-help').html(v.render().el);

        _.defer(function() {
            var group = Iznik.Session.getGroup(self.options.groupid);
            var centre = new google.maps.LatLng(group.get('lat'), group.get('lng'));
            var mapsettings = group.get('settings').map;

            var options = {
                center: centre,
                zoom: 14,
                defaults: {
                    icon: '/images/red_dot.png',
                    shadow: '/images/dot_shadow.png',
                    editable: true,
                    strokeColor: '#990000',
                    fillColor: '#EEFFCC',
                    fillOpacity: 0.6
                },
                disableDefaultUI: true,
                mapTypeControl: false,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                mapTypeControlOptions: {
                    position: google.maps.ControlPosition.TOP_LEFT,
                    style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
                },
                panControl: false,
                streetViewControl: false,
                zoomControl: true,
                minZoom: 12,
                zoomControlOptions: {
                    position: google.maps.ControlPosition.LEFT_TOP,
                    style: google.maps.ZoomControlStyle.SMALL
                }
            };

            self.map = new google.maps.Map(document.getElementById("map"), options);

            self.map.drawingManager = new google.maps.drawing.DrawingManager({
                drawingControlOptions: {
                    position: google.maps.ControlPosition.TOP_RIGHT,
                    drawingModes: [
                        google.maps.drawing.OverlayType.POLYGON
                    ]
                },
                markerOptions: self.map.defaults,
                polygonOptions: self.map.defaults,
                polylineOptions: self.map.defaults,
                rectangleOptions: self.map.defaults
            });
            self.map.drawingManager.setMap(self.map);

            google.maps.event.addListener(self.map.drawingManager, 'overlaycomplete', function (event) {
                console.log("Completed draw", event);
                var wkt;

                // Set the drawing mode to "pan" (the hand) so users can immediately edit
                this.setDrawingMode(null);

                // Polygon drawn
                var obj = event.overlay;
                var area = self.selected;

                if (event.type === google.maps.drawing.OverlayType.POLYGON || event.type === google.maps.drawing.OverlayType.POLYLINE) {
                    // New vertex is inserted
                    google.maps.event.addListener(obj.getPath(), 'insert_at', self.changeHandler(self, area, obj));

                    // Existing vertex is removed (insertion is undone)
                    google.maps.event.addListener(obj.getPath(), 'remove_at', self.changeHandler(self, area, obj));

                    // Existing vertex is moved (set elsewhere)
                    google.maps.event.addListener(obj.getPath(), 'set_at', self.changeHandler(self, area, obj));
                }

                self.features.push(event.overlay);
                self.changeHandler(self, area, obj)();
            });

            // Searchbox
            var input = document.getElementById('pac-input');
            self.searchBox = new google.maps.places.SearchBox(input);
            self.map.controls[google.maps.ControlPosition.TOP_CENTER].push(input);

            self.map.addListener('bounds_changed', function() {
                self.searchBox.setBounds(self.map.getBounds());
            });

            self.searchBox.addListener('places_changed', function() {
                // Put the map here.
                var places = self.searchBox.getPlaces();

                if (places.length == 0) {
                    return;
                }

                var bounds = new google.maps.LatLngBounds();
                places.forEach(function(place) {
                    if (place.geometry.viewport) {
                        // Only geocodes have viewport.
                        bounds.union(place.geometry.viewport);
                    } else {
                        bounds.extend(place.geometry.location);
                    }
                });

                self.map.fitBounds(bounds);
            });

            google.maps.event.addListener(self.map, 'idle', _.bind(self.getAreas, self));
        });
    }
});