sub init()
    m.poster = m.top.FindNode("poster")
    m.title = m.top.FindNode("title")
    m.creator = m.top.FindNode("creator")
    m.wid = m.top.FindNode("wid")
    m.registered = m.top.FindNode("registered")
    m.playback = m.top.FindNode("playback")
    m.testimonyLabel = m.top.FindNode("testimonyLabel")
    m.testimony = m.top.FindNode("testimony")
end sub

sub showArtifact()
    artifact = m.top.artifact
    if artifact = invalid then return

    m.poster.uri = artifact.HDPosterUrl
    m.title.text = artifact.title
    if artifact.creatorHandle <> invalid and artifact.creatorHandle <> ""
        m.creator.text = artifact.creatorHandle
    else
        m.creator.text = artifact.creatorName
    end if

    if artifact.witnessId <> invalid and artifact.witnessId <> ""
        m.wid.text = "WID  " + artifact.witnessId
    else
        m.wid.text = "WID  Not yet registered"
    end if
    if artifact.registeredAt <> invalid and artifact.registeredAt <> ""
        m.registered.text = "Recorded in the registry  ·  " + artifact.registeredAt
    else
        m.registered.text = "Registry record pending publication details"
    end if

    m.playback.text = ""
    toggleProvenance()
end sub

sub showPlaybackState()
    m.playback.text = m.top.playbackState
end sub

sub toggleProvenance()
    shouldShow = m.top.showProvenance and m.top.artifact <> invalid
    m.testimonyLabel.visible = shouldShow
    m.testimony.visible = shouldShow
    if shouldShow
        origin = m.top.artifact.originStory
        if origin = invalid or origin = "" then origin = "No creator testimony has been shared for this manifestation."
        m.testimony.text = origin
    end if
end sub
