sub init()
    m.rows = m.top.FindNode("artifactRows")
    m.detail = m.top.FindNode("artifactDetail")
    m.player = m.top.FindNode("player")
    m.status = m.top.FindNode("status")
    m.mode = "home"

    m.rows.ObserveField("rowItemSelected", "onArtifactSelected")
    m.loader = CreateObject("roSGNode", "ContentLoaderTask")
    m.loader.endpoint = "https://www.livingnexus.org/api/v1/roku/home"
    m.loader.ObserveField("content", "onFeedLoaded")
    m.loader.ObserveField("error", "onFeedError")
    m.loader.control = "RUN"
    m.status.text = "Gathering the living record…"
end sub

sub onFeedLoaded()
    if m.loader.content <> invalid and m.loader.content.GetChildCount() > 0
        m.rows.content = m.loader.content
        m.rows.SetFocus(true)
        m.status.text = "Use the directional pad to explore. Press * to inspect provenance."
    end if
end sub

sub onFeedError()
    if m.loader.error <> invalid and m.loader.error <> ""
        m.status.text = "The living record is unavailable right now. Please try again later."
        print "[Living Nexus Roku] " + m.loader.error
    end if
end sub

sub onArtifactSelected()
    selection = m.rows.rowItemSelected
    if selection = invalid then return

    row = m.rows.content.GetChild(selection[0])
    if row = invalid then return
    artifact = row.GetChild(selection[1])
    if artifact = invalid then return

    m.currentArtifact = artifact
    m.detail.artifact = artifact
    m.detail.showProvenance = false
    m.detail.visible = true
    m.mode = "detail"
end sub

function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press then return false

    if m.mode = "detail"
        if key = "back"
            closeDetail()
            return true
        else if key = "OK"
            playCurrentArtifact()
            return true
        else if key = "options"
            m.detail.showProvenance = not m.detail.showProvenance
            return true
        end if
    end if

    return false
end function

sub playCurrentArtifact()
    if m.currentArtifact = invalid or m.currentArtifact.url = invalid or m.currentArtifact.url = "" then return

    m.player.uri = m.currentArtifact.url
    m.player.streamFormat = m.currentArtifact.streamFormat
    m.player.control = "play"
    m.detail.playbackState = "NOW LISTENING"
end sub

sub closeDetail()
    m.detail.visible = false
    m.detail.showProvenance = false
    m.mode = "home"
    m.rows.SetFocus(true)
end sub
