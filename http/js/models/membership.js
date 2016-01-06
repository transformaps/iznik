// Terminology:
// - A user corresponds to a real person, or someone pretending to be; that's in user.js
// - A member is the user's presence on a specific group; that's in here

Iznik.Models.Membership = IznikModel.extend({
    url: function() {
        var url = API + 'memberships/' + this.get('groupid') + '/' + this.get('userid');
        url = this.get('ban') ? (url + '?ban=true') : url;

        return (url);
    },

    parse: function(ret) {
        // We might be called either when parsing a collection or a single membership.
        return(ret.hasOwnProperty('member') ? ret.member : ret);
    },

    reply: function(subject, body, stdmsgid) {
        var self = this;

        $.ajax({
            type: 'POST',
            url: API + 'user/' + self.get('userid'),
            data: {
                subject: subject,
                body: body,
                stdmsgid: stdmsgid,
                groupid: self.get('groupid')
            }, success: function(ret) {
                self.trigger('replied');
            }
        });
    }
});

Iznik.Collections.Members = IznikCollection.extend({
    model: Iznik.Models.Membership,

    ret: null,

    initialize: function (models, options) {
        this.options = options;

        // Use a comparator to show in most recent first order
        this.comparator = function(a, b) {
            var ret = (new Date(b.get('joined'))).getTime() - (new Date(a.get('joined'))).getTime();
            return(ret);
        }
    },

    url: function() {
        return (API + 'memberships/' + this.options.groupid)
    },

    parse: function(ret) {
        // Save off the return in case we need any info from it, e.g. context for searches.
        this.ret = ret;
        return(ret.members);
    }
});

Iznik.Collections.Members.Search = Iznik.Collections.Members.extend({
    url: function() {
        return(API + 'memberships/' + this.options.groupid + '?search=' + encodeURIComponent(this.options.search));
    }
});