Blacklight Edit
===============

This Blacklight module provides the ability to create fields, dialogs and other UI elements for content editors to make changes to CMS data.

The module expects to find two key files added to your component definition folder in order to function:

* `dialog.js` which describes the fields that go inside that particular component resource type.
* `container.js` which describes the child components that go inside that particular component resource type.

Each `dialog.js` describes a series of panels, tabs or fieldsets which contain lists of fields, which in turn reference widgets of various types.  The list of available "default" widgets can be found in the blacklight-edit module itself, at `apps/blacklight/edit/widgets`.

Each `container.js` describes the set of child component types that it `includes` (if any).  One special type of container is the `Editable Component Container` (`ECC`) which alows authors to dynamically determine how many and what kind of child components to include in a parent component.  The ECC behaviour can be controlled by declaring allowed `eccItems` in your `includes` definition for that ECC.


