# Third-party notices

siterun is licensed under GPL-3.0-or-later. It bundles the third-party software below. Each component keeps its own licence; siterun's licence does not replace it.

## Bundled at runtime

### PHP 8.4.27

Copyright (c) The PHP Group. Licensed under the PHP License, version 3.01. The full text is below.

Location: `engine/php-bin/8.4.27-studio-2`.

### WordPress 7.1.5

Copyright the WordPress contributors. Licensed under GPL-2.0-or-later. The full licence is in `wordpress/license.txt` inside `engine/wp-files/latest/wordpress.zip`.

The bundle includes the default WordPress themes and Akismet. They keep their own GPL-compatible licences.

### WP-CLI

Copyright the WP-CLI contributors. Licensed under the MIT licence. The full text is below.

Location: `engine/wp-files/wp-cli/wp-cli.phar`.

### SQLite Database Integration

Licensed under GPL-2.0-or-later. The full licence is in `engine/wp-files/sqlite-database-integration/LICENSE`.

### SQLite Command

Licensed under GPL-2.0-or-later. The full licence is in `engine/wp-files/sqlite-command/LICENSE`.

### WordPress Importer

Licensed under GPL-2.0-or-later. The full licence and the licences of its bundled PHP libraries are inside `engine/wp-files/wordpress-importer.zip`.

### WordPress Playground Blueprints

Part of [WordPress Playground](https://github.com/WordPress/wordpress-playground), licensed under GPL-2.0-or-later.

Location: `engine/wp-files/blueprints/blueprints.phar`.

## npm packages

The app and engine bundle code from the packages declared in `package-lock.json`. The lockfile records the full dependency tree and every package's licence identifier. The licence text for each package ships in its npm tarball and is available in `node_modules` after `npm install`.

Direct dependencies:

| Package | Licence |
| --- | --- |
| `@automattic/generate-password` | GPL-2.0-or-later |
| `@formatjs/intl-localematcher` | MIT |
| `@inquirer/ansi` | MIT |
| `@inquirer/core` | MIT |
| `@inquirer/figures` | MIT |
| `@inquirer/prompts` | MIT |
| `@playwright/test` | Apache-2.0 |
| `@types/archiver` | MIT |
| `@types/http-proxy` | MIT |
| `@types/lockfile` | MIT |
| `@types/node` | MIT |
| `@types/node-forge` | MIT |
| `@types/react` | MIT |
| `@types/react-dom` | MIT |
| `@types/semver` | MIT |
| `@types/shell-quote` | MIT |
| `@types/yargs` | MIT |
| `@types/yauzl` | MIT |
| `@vscode/sudo-prompt` | MIT |
| `@wordpress/admin-ui` | GPL-2.0-or-later |
| `@wordpress/components` | GPL-2.0-or-later |
| `@wordpress/dataviews` | GPL-2.0-or-later |
| `@wordpress/element` | GPL-2.0-or-later |
| `@wordpress/eslint-plugin` | GPL-2.0-or-later |
| `@wordpress/hooks` | GPL-2.0-or-later |
| `@wordpress/i18n` | GPL-2.0-or-later |
| `@wordpress/icons` | GPL-2.0-or-later |
| `@wordpress/theme` | GPL-2.0-or-later |
| `@wordpress/ui` | GPL-2.0-or-later |
| `@wp-playground/blueprints` | GPL-2.0 |
| `archiver` | MIT |
| `atomically` | MIT |
| `chalk` | MIT |
| `chokidar` | MIT |
| `cli-table3` | MIT |
| `date-fns` | MIT |
| `electron` | MIT |
| `electron-builder` | MIT |
| `esbuild` | MIT |
| `eslint` | MIT |
| `fs-extra` | MIT |
| `glob` | BlueOak-1.0.0 |
| `globals` | MIT |
| `http-proxy` | MIT |
| `ignore` | MIT |
| `lockfile` | ISC |
| `node-forge` | (BSD-3-Clause OR GPL-2.0) |
| `picospinner` | MIT |
| `postal-mime` | MIT-0 |
| `semver` | ISC |
| `shell-quote` | MIT |
| `stylelint` | MIT |
| `tar` | BlueOak-1.0.0 |
| `trash` | MIT |
| `typescript` | Apache-2.0 |
| `undici` | MIT |
| `vite` | MIT |
| `yargs` | MIT |
| `yargs-parser` | ISC |
| `yauzl` | MIT |
| `zod` | MIT |

## Full licence texts

### PHP License, version 3.01

```text
============= An example PHP License, version 3.01 file ============

This is the original PHP License, version 3.01, which applies only to
old versions of PHP software (such as versions 8.5 and earlier).

The PHP License, version 3.01, is an Open Source Initiative approved
license, available at <https://opensource.org/license/php-3-01>. This
license is provided for historical purposes only.

This license has been superseded by the PHP License, version 4,
available at <https://www.php.net/license/>. The PHP License, version 4
is the Modified BSD License (BSD-3-Clause). All new works using the PHP
License should use the Modified BSD License.


--------------------------------------------------------------------
                  The PHP License, version 3.01
Copyright (c) 1999 - 2026 The PHP Group. All rights reserved.
--------------------------------------------------------------------

Redistribution and use in source and binary forms, with or without
modification, is permitted provided that the following conditions
are met:

  1. Redistributions of source code must retain the above copyright
     notice, this list of conditions and the following disclaimer.

  2. Redistributions in binary form must reproduce the above copyright
     notice, this list of conditions and the following disclaimer in
     the documentation and/or other materials provided with the
     distribution.

  3. The name "PHP" must not be used to endorse or promote products
     derived from this software without prior written permission. For
     written permission, please contact group@php.net.

  4. Products derived from this software may not be called "PHP", nor
     may "PHP" appear in their name, without prior written permission
     from group@php.net.  You may indicate that your software works in
     conjunction with PHP by saying "Foo for PHP" instead of calling
     it "PHP Foo" or "phpfoo"

  5. The PHP Group may publish revised and/or new versions of the
     license from time to time. Each version will be given a
     distinguishing version number.
     Once covered code has been published under a particular version
     of the license, you may always continue to use it under the terms
     of that version. You may also choose to use such covered code
     under the terms of any subsequent version of the license
     published by the PHP Group. No one other than the PHP Group has
     the right to modify the terms applicable to covered code created
     under this License.

  6. Redistributions of any form whatsoever must retain the following
     acknowledgment:
     "This product includes PHP software, freely available from
     <http://www.php.net/software/>".

THIS SOFTWARE IS PROVIDED BY THE PHP DEVELOPMENT TEAM ``AS IS'' AND
ANY EXPRESSED OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE PHP
DEVELOPMENT TEAM OR ITS CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
OF THE POSSIBILITY OF SUCH DAMAGE.

--------------------------------------------------------------------

This software consists of voluntary contributions made by many
individuals on behalf of the PHP Group.

The PHP Group can be contacted via Email at group@php.net.

For more information on the PHP Group and the PHP project,
please see <http://www.php.net>.

PHP includes the Zend Engine, freely available at
<http://www.zend.com>.
```

### WP-CLI MIT licence

```text
MIT License

Copyright (c) WP-CLI contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
