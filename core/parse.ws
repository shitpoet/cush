fun filter_parsed_name(name, dic)
  if dic
    let parts = name.split(/(?=[-_])/)
    for i = 0; i < parts.len; i++
      let part = parts[i]
      let bare = part
      if part.startsWith('-') { bare = part.slice(1) }
      elif part.startsWith('_') { bare = part.slice(1) }
      //l(bare)
      if bare in dic
        parts[i] = part.replace(bare, dic[bare])
        log('expand '+part+' to '+parts[i])
    ret parts.join('')
  else
    ret name

export fun filter_parsed_tname(name)
  ret filter_parsed_name(name, projectInfo.tag_aliases)

export fun filter_parsed_cname(name)
  ret filter_parsed_name(name, projectInfo.class_aliases)

export fun add_parsed_class(classes, name)
  classes.push( filter_parsed_cname(name) )
