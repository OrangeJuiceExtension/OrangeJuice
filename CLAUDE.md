Always follow these directions:
* Use bun instead of npm in terminal command exection
* Prefer for...of instead of forEach
* Clean up any resources that might leak when the context is invalidated
* Extract inline regex to a const
* Reduce unnecessary code duplication and excessive complexity
* Block statements are preferred: if (!stored) { return []; }
* Number.parseInt instead of parseInt
* Wrap tests in a top level describe()
* Infer the correct type for document.querySelector based on the selector
* In tests, always generate valid HTML, especially for tables. Invalid: <div><td></td></div>. Valid: <div><table><tbody><tr><td></td></tr></tbody></table></div>