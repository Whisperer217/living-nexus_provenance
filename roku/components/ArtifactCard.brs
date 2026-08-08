sub init()
    m.poster = m.top.FindNode("poster")
    m.title = m.top.FindNode("title")
    m.creator = m.top.FindNode("creator")
    m.focusBorder = m.top.FindNode("focusBorder")
end sub

sub showContent()
    artifact = m.top.itemContent
    if artifact = invalid then return

    m.poster.uri = artifact.HDPosterUrl
    m.title.text = artifact.title
    if artifact.creatorHandle <> invalid and artifact.creatorHandle <> ""
        m.creator.text = artifact.creatorHandle
    else
        m.creator.text = artifact.creatorName
    end if
end sub

sub showFocus()
    if m.top.focusPercent > 0
        m.focusBorder.opacity = 1
    else
        m.focusBorder.opacity = 0
    end if
end sub
