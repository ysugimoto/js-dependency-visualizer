js-dependency-visualizer
========================

JavaScript Module dependency visualizer.
Analyze source file, and detect annotation.
Visualize object links "SVG".

### Install

please clone this repository ( or global )

```
npm install [-g] js-dependency-visualizer
```

if installed global, you can use `js-dependency-visualizer` command.

### Usage

please show help below:

```
js-dependency-visualizer -h
>>>
JavaScript Module Dependency Visualizer
===========================================================================
Usage: js-dependency-visualizer [arguments]

arguments:
  -d, --dest    output destiation path. default value is current path with "visualize" directory.
  -s, --src     analyze source path. default value is current pathr.
  -v, --verbose verbose processing log.
```

After command execution, program will create `visualize` directory.
Open `visual.html` on your browser (need to support SVG support).

### Screen shot

This is generated visual from example project ( example/ bundled )

https://s3-ap-northeast-1.amazonaws.com/sugimoto/visualize-shot.png

### Thanks

This project inspired by `objc-dependency-visualizer`. Thanks!

https://github.com/PaulTaykalo/objc-dependency-visualizer

### LICENSE

MIT License.

