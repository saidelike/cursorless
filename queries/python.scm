;; Generated by the following command:
;; > curl https://raw.githubusercontent.com/tree-sitter/tree-sitter-python/d6210ceab11e8d812d4ab59c07c81458ec6e5184/src/node-types.json \
;;   | jq '[.[] | select(.type == "_simple_statement" or .type == "_compound_statement") | .subtypes[].type]'
[
  (assert_statement)
  (break_statement)
  (class_definition)
  (continue_statement)
  (decorated_definition)
  (delete_statement)
  (exec_statement)
  (expression_statement)
  (for_statement)
  (function_definition)
  (future_import_statement)
  (global_statement)
  (if_statement)
  (import_from_statement)
  (import_statement)
  (nonlocal_statement)
  (pass_statement)
  (print_statement)
  (raise_statement)
  (return_statement)
  (try_statement)
  (while_statement)
  (with_statement)
] @statement

;; a = 25
;;     ^^
(
  (assignment
    right: (_) @value
  ) @_.domain
)

;; a /= 25
;;      ^^
(
  (augmented_assignment
    right: (_) @value
  ) @_.domain
)

;; d = {"a": 1234}
;;           ^^^^
;;      ---------
;;
;; NOTE: we ignore d["a"] of type
;; (subscript
;;  value: ...
;; )
(
  (_
    value: (_) @value
  ) @_.domain
  (#not-type? @_.domain subscript)
)

;; def func():
;;     return 1
;;            ^
;;     --------
;;
;; NOTE: in tree-sitter, both "return" and the b are children of `return_statement`
;; but "return" is anonymous whereas b is named node, so no need to exclude explicitly
(
  (return_statement
    (_) @value
  ) @_.domain
)

(
  (function_definition
    name: (_) @functionName
    body: (_) @namedFunction.interior
  ) @namedFunction @functionName.domain
  (#not-parent-type? @namedFunction decorated_definition)
)
(decorated_definition
  (function_definition
    name: (_) @functionName
    body: (_) @namedFunction.interior
  )
) @namedFunction @functionName.domain

(
  (class_definition
    name: (_) @className
    body: (_) @class.interior
  ) @class @className.domain
  (#not-parent-type? @class decorated_definition)
)
(decorated_definition
  (class_definition
    name: (_) @className
    body: (_) @class.interior
  )
) @class @className.domain

(module) @className.iteration @class.iteration
(module) @statement.iteration
(module) @namedFunction.iteration @functionName.iteration
(class_definition) @namedFunction.iteration @functionName.iteration
(_
  body: (_) @statement.iteration
)
