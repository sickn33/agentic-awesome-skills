using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Diagnostics;

namespace AasVerifier
{
    public sealed class JobProcessHandles
    {
        public IntPtr JobHandle;
        public IntPtr ProcessHandle;
        public int ProcessId;
    }

    public static class JobProcess
    {
        public const uint WaitObject0 = 0x00000000;
        public const uint WaitTimeout = 0x00000102;
        public const uint WaitFailed = 0xffffffff;

        private const uint GenericRead = 0x80000000;
        private const uint GenericWrite = 0x40000000;
        private const uint FileShareRead = 0x00000001;
        private const uint FileShareWrite = 0x00000002;
        private const uint CreateAlways = 2;
        private const uint OpenExisting = 3;
        private const uint FileAttributeNormal = 0x00000080;
        private const uint CreateSuspended = 0x00000004;
        private const uint CreateNoWindow = 0x08000000;
        private const uint StartfUseStdHandles = 0x00000100;
        private const uint JobObjectLimitKillOnJobClose = 0x00002000;
        private const uint Synchronize = 0x00100000;
        private const int JobObjectBasicAccountingInformationClass = 1;
        private const int JobObjectExtendedLimitInformationClass = 9;
        private static readonly IntPtr InvalidHandleValue = new IntPtr(-1);

        [StructLayout(LayoutKind.Sequential)]
        private struct SecurityAttributes
        {
            public int Length;
            public IntPtr SecurityDescriptor;
            [MarshalAs(UnmanagedType.Bool)] public bool InheritHandle;
        }

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        private struct StartupInfo
        {
            public int Size;
            public string Reserved;
            public string Desktop;
            public string Title;
            public int X;
            public int Y;
            public int XSize;
            public int YSize;
            public int XCountChars;
            public int YCountChars;
            public int FillAttribute;
            public int Flags;
            public short ShowWindow;
            public short Reserved2;
            public IntPtr Reserved2Pointer;
            public IntPtr StandardInput;
            public IntPtr StandardOutput;
            public IntPtr StandardError;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct ProcessInformation
        {
            public IntPtr Process;
            public IntPtr Thread;
            public int ProcessId;
            public int ThreadId;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct JobObjectBasicLimitInformation
        {
            public long PerProcessUserTimeLimit;
            public long PerJobUserTimeLimit;
            public uint LimitFlags;
            public UIntPtr MinimumWorkingSetSize;
            public UIntPtr MaximumWorkingSetSize;
            public uint ActiveProcessLimit;
            public UIntPtr Affinity;
            public uint PriorityClass;
            public uint SchedulingClass;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct JobObjectBasicAccountingInformation
        {
            public long TotalUserTime;
            public long TotalKernelTime;
            public long ThisPeriodTotalUserTime;
            public long ThisPeriodTotalKernelTime;
            public uint TotalPageFaultCount;
            public uint TotalProcesses;
            public uint ActiveProcesses;
            public uint TotalTerminatedProcesses;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct IoCounters
        {
            public ulong ReadOperationCount;
            public ulong WriteOperationCount;
            public ulong OtherOperationCount;
            public ulong ReadTransferCount;
            public ulong WriteTransferCount;
            public ulong OtherTransferCount;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct JobObjectExtendedLimitInformation
        {
            public JobObjectBasicLimitInformation BasicLimitInformation;
            public IoCounters IoInfo;
            public UIntPtr ProcessMemoryLimit;
            public UIntPtr JobMemoryLimit;
            public UIntPtr PeakProcessMemoryUsed;
            public UIntPtr PeakJobMemoryUsed;
        }

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern IntPtr CreateJobObjectW(IntPtr jobAttributes, string name);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool SetInformationJobObject(
            IntPtr job,
            int informationClass,
            ref JobObjectExtendedLimitInformation information,
            int informationLength);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool TerminateJobObject(IntPtr job, uint exitCode);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool QueryInformationJobObject(
            IntPtr job,
            int informationClass,
            ref JobObjectBasicAccountingInformation information,
            int informationLength,
            IntPtr returnLength);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool GetExitCodeProcess(IntPtr process, out uint exitCode);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern uint ResumeThread(IntPtr thread);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool TerminateProcess(IntPtr process, uint exitCode);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern IntPtr OpenProcess(uint desiredAccess, [MarshalAs(UnmanagedType.Bool)] bool inheritHandle, int processId);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern uint WaitForSingleObject(IntPtr handle, uint milliseconds);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool CloseHandle(IntPtr handle);

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern IntPtr CreateFileW(
            string fileName,
            uint desiredAccess,
            uint shareMode,
            ref SecurityAttributes securityAttributes,
            uint creationDisposition,
            uint flagsAndAttributes,
            IntPtr templateFile);

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool CreateProcessW(
            string applicationName,
            StringBuilder commandLine,
            IntPtr processAttributes,
            IntPtr threadAttributes,
            [MarshalAs(UnmanagedType.Bool)] bool inheritHandles,
            uint creationFlags,
            IntPtr environment,
            string currentDirectory,
            ref StartupInfo startupInfo,
            out ProcessInformation processInformation);

        private static void ThrowLastError(string operation)
        {
            throw new Win32Exception(Marshal.GetLastWin32Error(), operation);
        }

        private static string QuoteArgument(string argument)
        {
            if (argument == null) throw new ArgumentNullException("argument");
            if (argument.Length > 0 && argument.IndexOfAny(new[] { ' ', '\t', '\n', '\v', '"' }) < 0) return argument;
            StringBuilder output = new StringBuilder();
            output.Append('"');
            int backslashes = 0;
            foreach (char character in argument)
            {
                if (character == '\\')
                {
                    backslashes++;
                }
                else if (character == '"')
                {
                    output.Append('\\', backslashes * 2 + 1);
                    output.Append('"');
                    backslashes = 0;
                }
                else
                {
                    output.Append('\\', backslashes);
                    output.Append(character);
                    backslashes = 0;
                }
            }
            output.Append('\\', backslashes * 2);
            output.Append('"');
            return output.ToString();
        }

        private static StringBuilder BuildCommandLine(string executable, string[] arguments)
        {
            List<string> tokens = new List<string>();
            tokens.Add(QuoteArgument(executable));
            foreach (string argument in arguments) tokens.Add(QuoteArgument(argument));
            return new StringBuilder(string.Join(" ", tokens.ToArray()));
        }

        public static JobProcessHandles Start(
            string executable,
            string[] arguments,
            string stdoutPath,
            string stderrPath)
        {
            IntPtr job = IntPtr.Zero;
            IntPtr standardInput = InvalidHandleValue;
            IntPtr standardOutput = InvalidHandleValue;
            IntPtr standardError = InvalidHandleValue;
            ProcessInformation process = new ProcessInformation();
            bool processCreated = false;
            bool processAssigned = false;
            try
            {
                job = CreateJobObjectW(IntPtr.Zero, null);
                if (job == IntPtr.Zero) ThrowLastError("CreateJobObjectW failed");
                JobObjectExtendedLimitInformation limits = new JobObjectExtendedLimitInformation();
                limits.BasicLimitInformation.LimitFlags = JobObjectLimitKillOnJobClose;
                if (!SetInformationJobObject(
                    job,
                    JobObjectExtendedLimitInformationClass,
                    ref limits,
                    Marshal.SizeOf(typeof(JobObjectExtendedLimitInformation))))
                {
                    ThrowLastError("SetInformationJobObject failed");
                }

                SecurityAttributes inheritable = new SecurityAttributes();
                inheritable.Length = Marshal.SizeOf(typeof(SecurityAttributes));
                inheritable.InheritHandle = true;
                standardInput = CreateFileW("NUL", GenericRead, FileShareRead | FileShareWrite, ref inheritable, OpenExisting, FileAttributeNormal, IntPtr.Zero);
                standardOutput = CreateFileW(stdoutPath, GenericWrite, FileShareRead | FileShareWrite, ref inheritable, CreateAlways, FileAttributeNormal, IntPtr.Zero);
                standardError = CreateFileW(stderrPath, GenericWrite, FileShareRead | FileShareWrite, ref inheritable, CreateAlways, FileAttributeNormal, IntPtr.Zero);
                if (standardInput == InvalidHandleValue || standardOutput == InvalidHandleValue || standardError == InvalidHandleValue)
                {
                    ThrowLastError("CreateFileW for redirected streams failed");
                }

                StartupInfo startup = new StartupInfo();
                startup.Size = Marshal.SizeOf(typeof(StartupInfo));
                startup.Flags = (int)StartfUseStdHandles;
                startup.StandardInput = standardInput;
                startup.StandardOutput = standardOutput;
                startup.StandardError = standardError;
                if (!CreateProcessW(
                    executable,
                    BuildCommandLine(executable, arguments),
                    IntPtr.Zero,
                    IntPtr.Zero,
                    true,
                    CreateSuspended | CreateNoWindow,
                    IntPtr.Zero,
                    null,
                    ref startup,
                    out process))
                {
                    ThrowLastError("CreateProcessW failed");
                }
                processCreated = true;
                if (!AssignProcessToJobObject(job, process.Process)) ThrowLastError("AssignProcessToJobObject failed");
                processAssigned = true;
                if (ResumeThread(process.Thread) == WaitFailed) ThrowLastError("ResumeThread failed");
                CloseHandle(process.Thread);
                process.Thread = IntPtr.Zero;
                return new JobProcessHandles { JobHandle = job, ProcessHandle = process.Process, ProcessId = process.ProcessId };
            }
            catch (Exception startError)
            {
                Exception cleanupError = null;
                if (processCreated && !processAssigned && process.Process != IntPtr.Zero)
                {
                    try
                    {
                        if (!TerminateProcess(process.Process, 125)) ThrowLastError("TerminateProcess for unassigned root failed");
                        if (WaitForSingleObject(process.Process, 5000) != WaitObject0)
                        {
                            throw new InvalidOperationException("Unassigned suspended root did not terminate within the cleanup budget");
                        }
                    }
                    catch (Exception error)
                    {
                        cleanupError = error;
                    }
                }
                if (job != IntPtr.Zero) CloseHandle(job);
                if (process.Thread != IntPtr.Zero) CloseHandle(process.Thread);
                if (process.Process != IntPtr.Zero) CloseHandle(process.Process);
                if (cleanupError != null)
                {
                    throw new AggregateException("Candidate start failed and cleanup of the unassigned root also failed", startError, cleanupError);
                }
                throw;
            }
            finally
            {
                if (standardInput != InvalidHandleValue) CloseHandle(standardInput);
                if (standardOutput != InvalidHandleValue) CloseHandle(standardOutput);
                if (standardError != InvalidHandleValue) CloseHandle(standardError);
            }
        }

        public static uint Wait(JobProcessHandles handles, int milliseconds)
        {
            Stopwatch stopwatch = Stopwatch.StartNew();
            while (true)
            {
                JobObjectBasicAccountingInformation accounting = new JobObjectBasicAccountingInformation();
                if (!QueryInformationJobObject(
                    handles.JobHandle,
                    JobObjectBasicAccountingInformationClass,
                    ref accounting,
                    Marshal.SizeOf(typeof(JobObjectBasicAccountingInformation)),
                    IntPtr.Zero))
                {
                    ThrowLastError("QueryInformationJobObject failed");
                }
                if (accounting.ActiveProcesses == 0) return WaitObject0;
                if (stopwatch.ElapsedMilliseconds >= milliseconds) return WaitTimeout;
                Thread.Sleep(Math.Min(25, Math.Max(1, milliseconds - (int)stopwatch.ElapsedMilliseconds)));
            }
        }

        public static uint TotalProcesses(JobProcessHandles handles)
        {
            JobObjectBasicAccountingInformation accounting = new JobObjectBasicAccountingInformation();
            if (!QueryInformationJobObject(
                handles.JobHandle,
                JobObjectBasicAccountingInformationClass,
                ref accounting,
                Marshal.SizeOf(typeof(JobObjectBasicAccountingInformation)),
                IntPtr.Zero))
            {
                ThrowLastError("QueryInformationJobObject failed");
            }
            return accounting.TotalProcesses;
        }

        public static void Terminate(JobProcessHandles handles, uint exitCode)
        {
            if (!TerminateJobObject(handles.JobHandle, exitCode)) ThrowLastError("TerminateJobObject failed");
        }

        public static uint ExitCode(JobProcessHandles handles)
        {
            uint exitCode;
            if (!GetExitCodeProcess(handles.ProcessHandle, out exitCode)) ThrowLastError("GetExitCodeProcess failed");
            return exitCode;
        }

        public static bool WaitForProcessExit(int processId, int milliseconds)
        {
            if (processId <= 0) throw new ArgumentOutOfRangeException("processId");
            if (milliseconds < 1 || milliseconds > 900000) throw new ArgumentOutOfRangeException("milliseconds");
            IntPtr process = OpenProcess(Synchronize, false, processId);
            if (process == IntPtr.Zero) ThrowLastError("OpenProcess for parent synchronization failed");
            try
            {
                uint result = WaitForSingleObject(process, (uint)milliseconds);
                if (result == WaitObject0) return true;
                if (result == WaitTimeout) return false;
                ThrowLastError("WaitForSingleObject for parent synchronization failed");
                return false;
            }
            finally
            {
                CloseHandle(process);
            }
        }

        public static void Close(JobProcessHandles handles)
        {
            if (handles == null) return;
            if (handles.JobHandle != IntPtr.Zero)
            {
                CloseHandle(handles.JobHandle);
                handles.JobHandle = IntPtr.Zero;
            }
            if (handles.ProcessHandle != IntPtr.Zero)
            {
                CloseHandle(handles.ProcessHandle);
                handles.ProcessHandle = IntPtr.Zero;
            }
        }
    }
}
