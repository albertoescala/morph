/* ***** BEGIN LICENSE BLOCK *****
 * Distributed under the BSD license:
 *
 * Copyright (c) 2010, Ajax.org B.V.
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of Ajax.org B.V. nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL AJAX.ORG B.V. BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * The main class required to set up an Ace instance in the browser.
 *
 * @class Ace
 **/

import * as $____lib_dom from './lib/dom'
import * as $____lib_event from './lib/event'
import * as $____editor from './editor'
import * as $____edit_session from './edit_session.js'
import * as $____undomanager from './undomanager'
import * as $____virtual_renderer from './virtual_renderer'
import * as $____worker_worker_client from './worker/worker_client'
import * as $____keyboard_hash_handler from './keyboard/hash_handler'
import * as $____placeholder from './placeholder'
import * as $____multi_select from './multi_select'
import * as $____mode_folding_fold_mode from './mode/folding/fold_mode'
// import * as $____theme_textmate from "./theme/textmate";
import * as $____ext_error_marker from './ext/error_marker'
import $____config from './config'

var dom = $____lib_dom
var event = $____lib_event

var Editor = $____editor.Editor
export var EditSession = $____edit_session.EditSession
export var UndoManager = $____undomanager.UndoManager
var Renderer = $____virtual_renderer.VirtualRenderer

// The following require()s are for inclusion in the built ace file
$____worker_worker_client
$____keyboard_hash_handler
$____placeholder
$____multi_select
$____mode_folding_fold_mode
// $____theme_textmate;
$____ext_error_marker

export var config = $____config

/**
 * Embeds the Ace editor into the DOM, at the element provided by `el`.
 * @param {String | DOMElement} el Either the id of an element, or the element itself
 *
 **/
export var edit = function(el) {
  if (typeof el == 'string') {
    var _id = el
    el = document.getElementById(_id)
    if (!el) throw new Error("ace.edit can't find div #" + _id)
  }

  if (el && el.env && el.env.editor instanceof Editor) return el.env.editor

  var value = ''
  if (el && /input|textarea/i.test(el.tagName)) {
    var oldNode = el
    value = oldNode.value
    el = dom.createElement('pre')
    oldNode.parentNode.replaceChild(el, oldNode)
  } else if (el) {
    value = dom.getInnerText(el)
    el.innerHTML = ''
  }

  var doc = createEditSession(value)

  const renderer = new Renderer(el)

  var editor = new Editor(renderer, doc)
  // editor.setSession(doc);

  var env = {
    document: doc,
    editor: editor,
    onResize: editor.resize.bind(editor, null),
  }
  if (oldNode) env.textarea = oldNode
  event.addListener(window, 'resize', env.onResize)
  editor.on('destroy', function() {
    event.removeListener(window, 'resize', env.onResize)
    env.editor.container.env = null // prevent memory leak on old ie
  })
  editor.container.env = editor.env = env
  return editor
}

/**
 * Creates a new [[EditSession]], and returns the associated [[Document]].
 * @param {Document | String} text {:textParam}
 * @param {TextMode} mode {:modeParam}
 * 
 **/
export var createEditSession = function(text, mode) {
  var doc = new EditSession(text, mode)
  doc.setUndoManager(new UndoManager())
  return doc
}
export var version = '1.2.6'