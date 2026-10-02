import { isAxiosError } from 'axios';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { useImportVideo } from '../hooks/useImportVideo';

export function ImportVideoForm() {
  const [url, setUrl] = useState('');
  const navigate = useNavigate();
  const mutation = useImportVideo();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate(url, {
      onSuccess: (result) => {
        setUrl('');
        // A single video has somewhere obvious to land; a playlist import
        // (possibly dozens of videos) doesn't have one single page to go
        // to, so it goes to the library, where all of them now show up.
        navigate(result.type === 'video' ? `/videos/${result.video.id}` : '/library');
      },
    });
  }

  const errorMessage = isAxiosError(mutation.error)
    ? ((mutation.error.response?.data as { error?: { message?: string } } | undefined)?.error
        ?.message ?? 'Something went wrong. Please try again.')
    : undefined;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      noValidate
    >
      <div className="flex-1">
        <TextField
          label="Import a video or playlist"
          type="url"
          required
          placeholder="https://www.youtube.com/watch?v=..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>
      <Button type="submit" isLoading={mutation.isPending}>
        Import
      </Button>
      {errorMessage && (
        <p role="alert" className="text-sm text-danger sm:basis-full">
          {errorMessage}
        </p>
      )}
    </form>
  );
}
