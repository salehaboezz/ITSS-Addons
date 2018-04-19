odoo.define('pos_ref',function(require){
"use strict";

var pos_model = require('point_of_sale.models');
var exports ={}

var OrderlineCollection = Backbone.Collection.extend({
    model: exports.Orderline,
});
var PaymentlineCollection = Backbone.Collection.extend({
    model: exports.Paymentline,
});

pos_model.Order = pos_model.Order.extend({

    initialize: function(attributes,options){
        Backbone.Model.prototype.initialize.apply(this, arguments);
        var self = this;
        options  = options || {};

        this.init_locked    = true;
        this.pos            = options.pos;
        this.selected_orderline   = undefined;
        this.selected_paymentline = undefined;
        this.screen_data    = {};  // see Gui
        this.temporary      = options.temporary || false;
        this.creation_date  = new Date();
        this.to_invoice     = false;
        this.orderlines     = new OrderlineCollection();
        this.paymentlines   = new PaymentlineCollection();
        this.pos_session_id = this.pos.pos_session.id;
        this.finalized      = false; // if true, cannot be modified.

        this.set({ client: null });

        if (options.json) {
            this.init_from_JSON(options.json);
        } else {
            this.sequence_number = this.pos.pos_session.sequence_number++;
            this.uid  = this.generate_unique_id();
            this.name = "Order " + this.uid;
            this.validation_date = undefined;
            this.fiscal_position = _.find(this.pos.fiscal_positions, function(fp) {
                return fp.id === self.pos.config.default_fiscal_position_id[0];
            });
        }

        this.on('change',              function(){ this.save_to_db("order:change"); }, this);
        this.orderlines.on('change',   function(){ this.save_to_db("orderline:change"); }, this);
        this.orderlines.on('add',      function(){ this.save_to_db("orderline:add"); }, this);
        this.orderlines.on('remove',   function(){ this.save_to_db("orderline:remove"); }, this);
        this.paymentlines.on('change', function(){ this.save_to_db("paymentline:change"); }, this);
        this.paymentlines.on('add',    function(){ this.save_to_db("paymentline:add"); }, this);
        this.paymentlines.on('remove', function(){ this.save_to_db("paymentline:rem"); }, this);

        this.init_locked = false;
        this.save_to_db();

        return this;
    },

    init_from_JSON: function(json) {
        var client;
        this.sequence_number = json.sequence_number;
        this.pos.pos_session.sequence_number = Math.max(this.sequence_number+1,this.pos.pos_session.sequence_number);
        this.session_id    = json.pos_session_id;
        this.uid = json.uid;
        this.name = "Order " + this.uid;
        this.validation_date = json.creation_date;

        if (json.fiscal_position_id) {
            var fiscal_position = _.find(this.pos.fiscal_positions, function (fp) {
                return fp.id === json.fiscal_position_id;
            });

            if (fiscal_position) {
                this.fiscal_position = fiscal_position;
            } else {
                console.error('ERROR: trying to load a fiscal position not available in the pos');
            }
        }

        if (json.partner_id) {
            client = this.pos.db.get_partner_by_id(json.partner_id);
            if (!client) {
                console.error('ERROR: trying to load a parner not available in the pos');
            }
        } else {
            client = null;
        }
        this.set_client(client);

        this.temporary = false;     // FIXME
        this.to_invoice = false;    // FIXME

        var orderlines = json.lines;
        for (var i = 0; i < orderlines.length; i++) {
            var orderline = orderlines[i][2];
            this.add_orderline(new exports.Orderline({}, {pos: this.pos, order: this, json: orderline}));
        }

        var paymentlines = json.statement_ids;
        for (var i = 0; i < paymentlines.length; i++) {
            var paymentline = paymentlines[i][2];
            var newpaymentline = new exports.Paymentline({},{pos: this.pos, order: this, json: paymentline});
            this.paymentlines.add(newpaymentline);

            if (i === paymentlines.length - 1) {
                this.select_paymentline(newpaymentline);
            }
        }
    },


    get_name: function() {
    var x=this.name
    var xx=String(x);
    var l=xx.length
    var o=xx.slice(0,6);
    if(o == 'Order '){
    var n=xx.slice(5,l);
    this.name =n
    }
    else{
    this.name =x
    }
    return this.name;
    },

    });

});
