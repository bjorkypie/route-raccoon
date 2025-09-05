import { Typography, LinearProgress, Stack } from '@mui/material';
import { useEffect, useState } from 'react';
const loadingMessages = [
    'digging through the trash... er, data...',
    "sniff sniff... ah, there's one!",
    'gathering acorns -- i mean, GPX files...',
    'paws deep in the best routes...',
    'rummaging.. ooh, something shiny!',
    'packing up the loot...',
    'almost there...'
]
const randomIndex = (numItems:number):number => Math.floor(Math.random() * numItems);
const randomMessage = ():string => loadingMessages[randomIndex(loadingMessages.length)];
export default function Loading () {

    const [message, setMessage] = useState<string>(randomMessage());

    useEffect(() => {
       const id = setInterval(() => {
            setMessage(randomMessage());
        }, 4000)
        return () => clearInterval(id)
    }, [])
    return(
        <Stack sx={{width: '100%', gap: 1}}>
            <Typography variant="body1" color="warning" sx={{mt:1,fontStyle:'italic'}}>
            {message}
            </Typography>
            <LinearProgress color="secondary" sx={{width: "100%"}} />
        </Stack>
    )


}
